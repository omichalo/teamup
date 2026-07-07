export const runtime = "nodejs";

import { cookies } from "next/headers";
import type { DocumentData } from "firebase-admin/firestore";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { adminAuth, getFirestoreAdmin } from "@/lib/firebase-admin";
import { resolveRole } from "@/lib/auth/roles";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/auth/audit-logger";
import { canAccessClubRegistration } from "@/lib/club-registration/registration-access";
import { getAppBaseUrl } from "@/lib/club-registration/stripe";
import { normalizeRegistrationPayment } from "@/lib/club-registration/payment/normalize-payment";
import {
  calculateQuoteForRecord,
  resolveRegistrationConfigForRecord,
} from "@/lib/club-registration-config/pricing-resolve";
import { resolveRegistrationDonationPricing } from "@/lib/club-registration/resolve-registration-donation";
import { resolveRegistrationPaymentRecipientEmails } from "@/lib/club-registration/resolve-registration-contact-email";
import {
  createStripeCheckoutForRegistration,
  persistSelfServiceStripeCheckout,
  recalculatePaymentForRequest,
} from "@/lib/club-registration/request-payment-checkout";
import {
  canSelfServiceCheckout,
  resolveSelfServicePayableCents,
} from "@/lib/club-registration/self-service-checkout";
import { formatPersonDisplayName } from "@/lib/shared/person-name-format";
import type { PriceQuote } from "@/lib/pricing/types";

const COLLECTION = "clubRegistrations";

async function resolveQuoteFromRegistration(
  data: DocumentData
): Promise<PriceQuote | null> {
  return calculateQuoteForRecord(data as Record<string, unknown>);
}

/**
 * POST /api/club/registration/[id]/checkout
 * Génère un lien Stripe Checkout pour le soumettant du dossier (sans e-mail).
 */
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!validateOrigin(req)) {
      return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;
    if (!sessionCookie) {
      return jsonNoStore({ error: "Authentification requise" }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const role = resolveRole(decoded.role as string | undefined);
    const { id } = await context.params;

    const rate = checkRateLimit(`club-checkout:${decoded.uid}:${id}`, 5, 15 * 60 * 1000);
    if (!rate.allowed) {
      return jsonNoStore(
        { error: "Trop de demandes de paiement. Réessayez dans quelques minutes." },
        { status: 429 }
      );
    }

    const db = getFirestoreAdmin();
    const docRef = db.collection(COLLECTION).doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return jsonNoStore({ error: "Dossier introuvable" }, { status: 404 });
    }

    const data = snap.data() ?? {};
    const submitterUid =
      typeof data.submitterUid === "string" ? data.submitterUid : undefined;
    if (!canAccessClubRegistration(role, submitterUid, decoded.uid)) {
      return jsonNoStore({ error: "Accès refusé" }, { status: 403 });
    }

    if (!canSelfServiceCheckout(data)) {
      return jsonNoStore(
        { error: "Ce dossier n'est pas éligible au paiement en ligne." },
        { status: 400 }
      );
    }

    const paymentEmails = resolveRegistrationPaymentRecipientEmails(data);
    const paymentEmail = paymentEmails[0] ?? null;
    if (!paymentEmail) {
      return jsonNoStore(
        { error: "Aucune adresse e-mail exploitable pour le paiement." },
        { status: 400 }
      );
    }

    const adherentName =
      formatPersonDisplayName(
        typeof data.firstName === "string" ? data.firstName : undefined,
        typeof data.lastName === "string" ? data.lastName : undefined
      ) || "adhérent";
    const baseUrl = getAppBaseUrl(req);
    const successUrl = `${baseUrl}/club/mes-inscriptions?payment=success&registration=${encodeURIComponent(id)}`;
    const cancelUrl = `${baseUrl}/club/mes-inscriptions?payment=cancelled&registration=${encodeURIComponent(id)}`;

    const quote = await resolveQuoteFromRegistration(data);
    const pricingConfig = await resolveRegistrationConfigForRecord(
      data as Record<string, unknown>
    );
    const donationPricing =
      quote != null
        ? resolveRegistrationDonationPricing(quote, data as Record<string, unknown>)
        : null;
    const invoiceTotalCents = donationPricing?.invoiceTotalCents ?? quote?.totalCents ?? 0;

    const payment = recalculatePaymentForRequest(
      normalizeRegistrationPayment(data),
      quote,
      invoiceTotalCents
    );

    const amountToPayCents =
      payment?.amountToPayCents ?? resolveSelfServicePayableCents(data);

    if (amountToPayCents <= 0) {
      return jsonNoStore({ error: "Aucun montant à régler pour ce dossier." }, { status: 400 });
    }

    const checkoutResult = await createStripeCheckoutForRegistration({
      registrationId: id,
      quote,
      donationPricing,
      pricingConfig,
      payment,
      amountToPayCents,
      paymentEmail,
      adherentName,
      successUrl,
      cancelUrl,
    });

    if (!checkoutResult.ok) {
      return jsonNoStore(checkoutResult.body, { status: checkoutResult.status });
    }

    await persistSelfServiceStripeCheckout({
      docRef,
      checkout: checkoutResult.result,
    });

    const sessionUrl = checkoutResult.result.session.url;
    if (!sessionUrl) {
      return jsonNoStore(
        { error: "Stripe n'a pas retourné de lien de paiement." },
        { status: 502 }
      );
    }

    logAuditAction(AUDIT_ACTIONS.CLUB_REGISTRATION_PAYMENT_REQUESTED, decoded.uid, {
      resource: "clubRegistration",
      resourceId: id,
      details: {
        amountCents: amountToPayCents,
        stripeCheckoutSessionId: checkoutResult.result.session.id,
        selfService: true,
      },
      success: true,
    });

    return jsonNoStore({ success: true, checkoutUrl: sessionUrl }, { status: 200 });
  } catch (error) {
    console.error("[api/club/registration/checkout]", error);
    return jsonNoStore(
      {
        error:
          error instanceof Error ? error.message : "Impossible d'ouvrir la page de paiement",
      },
      { status: 500 }
    );
  }
}
