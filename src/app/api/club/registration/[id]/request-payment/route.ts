export const runtime = "nodejs";

import { cookies } from "next/headers";
import { FieldValue, type DocumentData } from "firebase-admin/firestore";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { adminAuth, getFirestoreAdmin } from "@/lib/firebase-admin";
import { hasAnyRole, resolveRole, USER_ROLES } from "@/lib/auth/roles";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/auth/audit-logger";
import {
  createStripePaymentForRegistration,
  getAppBaseUrl,
} from "@/lib/club-registration/stripe";
import {
  normalizeRegistrationPayment,
  paymentToFirestoreUpdate,
} from "@/lib/club-registration/payment/normalize-payment";
import { recalculateRegistrationPayment } from "@/lib/club-registration/payment/payment-mutations";
import {
  calculateQuoteForRecord,
  resolveRegistrationConfigForRecord,
} from "@/lib/club-registration-config/pricing-resolve";
import { resolveRegistrationDonationPricing } from "@/lib/club-registration/resolve-registration-donation";
import {
  resolveRegistrationPaymentRecipientEmails,
} from "@/lib/club-registration/resolve-registration-contact-email";
import { getRegistrationPaymentAids, resolveZeroDueDossierStatus } from "@/lib/club-registration/payment/aid-receipt";
import {
  persistPaymentRequestedAndNotify,
  processManualPaymentFollowUp,
  recalculatePaymentForRequest,
  validateRegistrationStripeCheckout,
} from "@/lib/club-registration/request-payment-checkout";
import {
  buildPaidDossierValidationPatch,
  isRegistrationPaymentSettled,
  resolveSettledRequestPaymentAction,
} from "@/lib/club-registration/resolve-settled-request-payment";
import { dispatchPaymentConfirmedEmail } from "@/lib/email/dispatch-payment-confirmed-email";
import { buildMesInscriptionsUrl } from "@/lib/club-registration/mes-inscriptions-url";
import { formatPersonDisplayName } from "@/lib/shared/person-name-format";
import type { PriceQuote } from "@/lib/pricing/types";

const COLLECTION = "clubRegistrations";
const MANAGER_ROLES = [USER_ROLES.ADMIN, USER_ROLES.SECRETARY] as const;

async function resolveQuoteFromRegistration(
  data: DocumentData
): Promise<PriceQuote | null> {
  return calculateQuoteForRecord(data as Record<string, unknown>);
}

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
    if (!hasAnyRole(role, MANAGER_ROLES)) {
      return jsonNoStore({ error: "Accès refusé" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = ((await req.json().catch(() => ({}))) ?? {}) as {
      amountCents?: number;
    };

    const db = getFirestoreAdmin();
    const docRef = db.collection(COLLECTION).doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return jsonNoStore({ error: "Dossier introuvable" }, { status: 404 });
    }

    const data = snap.data() ?? {};
    const isResend = data.status === "payment_requested";
    const requestedAmount = body.amountCents ?? data.paymentAmountCents;

    const adherentName =
      formatPersonDisplayName(
        typeof data.firstName === "string" ? data.firstName : undefined,
        typeof data.lastName === "string" ? data.lastName : undefined
      ) || "adhérent";
    const baseUrl = getAppBaseUrl(req);

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
      payment?.amountToPayCents ??
      quote?.totalCents ??
      (typeof requestedAmount === "number" ? requestedAmount : 0);

    // Une remise à 0 € met paymentStatus à "paid" : traiter le zéro dû avant
    // le garde-fou « déjà réglé », sinon la validation est bloquée.
    if (amountToPayCents <= 0) {
      const zeroDue = resolveZeroDueDossierStatus(
        payment?.aids ?? getRegistrationPaymentAids(data)
      );
      const zeroPayment = payment
        ? recalculateRegistrationPayment({ ...payment, paymentStatus: "paid" })
        : null;
      await docRef.set(
        {
          ...(zeroPayment ? paymentToFirestoreUpdate(zeroPayment) : {}),
          status: zeroDue.status,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return jsonNoStore(
        {
          success: true,
          zeroDue: true,
          message: zeroDue.message,
        },
        { status: 200 }
      );
    }

    if (isRegistrationPaymentSettled(data as Record<string, unknown>, payment)) {
      const settledAction = resolveSettledRequestPaymentAction(data.status);
      if (settledAction.kind === "reject") {
        return jsonNoStore({ error: settledAction.error }, { status: 409 });
      }
      if (settledAction.kind === "already_finalized") {
        return jsonNoStore(
          {
            success: true,
            alreadySettled: true,
            message: settledAction.message,
          },
          { status: 200 }
        );
      }

      await docRef.set(
        {
          ...buildPaidDossierValidationPatch(payment),
          ...(data.paidAt == null ? { paidAt: FieldValue.serverTimestamp() } : {}),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      logAuditAction(AUDIT_ACTIONS.CLUB_REGISTRATION_UPDATED, decoded.uid, {
        resource: "clubRegistration",
        resourceId: id,
        details: { action: "validate_already_paid" },
        success: true,
      });

      const paidAmountCents = payment?.paidAmountCents ?? 0;
      if (paidAmountCents > 0) {
        try {
          await dispatchPaymentConfirmedEmail({
            registrationId: id,
            data,
            amountCents: paidAmountCents,
            source: "secretariat",
            req,
          });
        } catch (emailError) {
          console.error("[api/club/registration/request-payment] confirmation email", emailError);
        }
      }

      return jsonNoStore(
        {
          success: true,
          alreadySettled: true,
          message: settledAction.message,
        },
        { status: 200 }
      );
    }

    const paymentEmails = resolveRegistrationPaymentRecipientEmails(data);
    const paymentEmail = paymentEmails[0] ?? null;
    if (!paymentEmail) {
      return jsonNoStore(
        { error: "Aucune adresse e-mail exploitable pour envoyer la demande de paiement." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(requestedAmount) || requestedAmount <= 0) {
      return jsonNoStore(
        { error: "Indiquez un montant strictement positif avant de demander le paiement." },
        { status: 400 }
      );
    }

    if (requestedAmount !== amountToPayCents) {
      return jsonNoStore(
        {
          error:
            "Le montant à régler ne correspond pas au solde attendu. Enregistrez le devis ou alignez le montant.",
          expectedAmountCents: amountToPayCents,
        },
        { status: 400 }
      );
    }

    const paymentMethod = payment?.paymentMethod ?? "card";
    const stripeCapability = await createStripePaymentForRegistration({
      registrationId: id,
      amountToPayCents,
      paymentMethod,
    });

    if (!stripeCapability.supported) {
      const manualResult = await processManualPaymentFollowUp({
        docRef,
        registrationId: id,
        payment,
        quote,
        donationPricing,
        amountToPayCents,
        paymentMethod,
        paymentEmails,
        adherentName,
        baseUrl,
        requestedByUid: decoded.uid,
      });

      if (!manualResult.success) {
        return jsonNoStore({ error: manualResult.error }, { status: 500 });
      }

      return jsonNoStore(
        {
          success: true,
          manualFollowUp: true,
          message:
            "Dossier validé. Un e-mail d'instructions de règlement a été envoyé au contact du dossier.",
        },
        { status: 200 }
      );
    }

    const checkoutValidation = validateRegistrationStripeCheckout({
      quote,
      donationPricing,
      pricingConfig,
      payment,
      amountToPayCents,
    });
    if (!checkoutValidation.ok) {
      return jsonNoStore(checkoutValidation.body, { status: checkoutValidation.status });
    }

    await persistPaymentRequestedAndNotify({
      docRef,
      registrationId: id,
      payment,
      quote,
      donationPricing,
      amountToPayCents,
      paymentEmails,
      adherentName,
      baseUrl,
      requestedByUid: decoded.uid,
      isResend,
    });

    return jsonNoStore(
      {
        success: true,
        mesInscriptionsUrl: buildMesInscriptionsUrl(baseUrl, id),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[api/club/registration/request-payment]", error);
    return jsonNoStore(
      { error: error instanceof Error ? error.message : "Impossible de demander le paiement" },
      { status: 500 }
    );
  }
}
