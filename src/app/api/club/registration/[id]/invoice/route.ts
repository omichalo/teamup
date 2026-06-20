export const runtime = "nodejs";

import { cookies } from "next/headers";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { adminAuth, getFirestoreAdmin } from "@/lib/firebase-admin";
import { resolveRole } from "@/lib/auth/roles";
import { canAccessClubRegistration } from "@/lib/club-registration/registration-access";
import { isRegistrationPaidRecord } from "@/lib/club-registration/payment-proof";
import { normalizeRegistrationPayment } from "@/lib/club-registration/payment/normalize-payment";
import {
  createPaidOutOfBandInvoice,
  pickInvoiceDownloadUrl,
  retrieveStripeInvoiceLinks,
} from "@/lib/club-registration/stripe";

const COLLECTION = "clubRegistrations";

function resolveInvoiceEmail(data: Record<string, unknown>): string | null {
  const adherentEmail =
    typeof data.adherentEmail === "string" ? data.adherentEmail.trim() : "";
  if (adherentEmail.includes("@")) return adherentEmail;

  const submitterEmail =
    typeof data.submitterAccountEmail === "string"
      ? data.submitterAccountEmail.trim()
      : "";
  if (submitterEmail.includes("@")) return submitterEmail;

  return null;
}

function resolveInvoiceAmountCents(data: Record<string, unknown>): number {
  if (typeof data.paymentAmountCents === "number" && data.paymentAmountCents > 0) {
    return data.paymentAmountCents;
  }
  const payment = normalizeRegistrationPayment(data);
  if (payment?.amountToPayCents && payment.amountToPayCents > 0) {
    return payment.amountToPayCents;
  }
  return 0;
}

/**
 * GET /api/club/registration/[id]/invoice
 * Facture Stripe : admin, secrétariat, ou soumettant du dossier uniquement.
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;
    if (!sessionCookie) {
      return jsonNoStore({ error: "Authentification requise" }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const role = resolveRole(decoded.role as string | undefined);

    const { id } = await context.params;
    const db = getFirestoreAdmin();
    const snap = await db.collection(COLLECTION).doc(id).get();
    if (!snap.exists) {
      return jsonNoStore({ error: "Dossier introuvable" }, { status: 404 });
    }

    const data = snap.data() ?? {};
    const submitterUid =
      typeof data.submitterUid === "string" ? data.submitterUid : undefined;

    if (!canAccessClubRegistration(role, submitterUid, decoded.uid)) {
      return jsonNoStore({ error: "Accès refusé" }, { status: 403 });
    }

    let invoiceId =
      typeof data.stripeInvoiceId === "string" ? data.stripeInvoiceId : null;
    const isPaid = isRegistrationPaidRecord(data);
    if (!isPaid) {
      return jsonNoStore(
        { error: "La facture est disponible après confirmation du paiement." },
        { status: 403 }
      );
    }

    if (!invoiceId) {
      const email = resolveInvoiceEmail(data);
      if (!email) {
        return jsonNoStore(
          { error: "Aucun e-mail de contact pour générer la facture Stripe." },
          { status: 400 }
        );
      }

      const amountCents = resolveInvoiceAmountCents(data);
      if (amountCents <= 0) {
        return jsonNoStore(
          { error: "Montant invalide pour générer la facture Stripe." },
          { status: 400 }
        );
      }

      const adherentName =
        `${typeof data.firstName === "string" ? data.firstName : ""} ${
          typeof data.lastName === "string" ? data.lastName : ""
        }`.trim() || "adhérent";

      const created = await createPaidOutOfBandInvoice({
        registrationId: id,
        customerEmail: email,
        amountCents,
        description: `Adhésion SQY Ping — ${adherentName}`,
      });
      invoiceId = created.invoiceId;
      await db.collection(COLLECTION).doc(id).set(
        {
          stripeInvoiceId: invoiceId,
        },
        { merge: true }
      );
    }

    if (!invoiceId) {
      return jsonNoStore(
        { error: "La facture Stripe n'a pas pu être générée." },
        { status: 502 }
      );
    }

    const links = await retrieveStripeInvoiceLinks(invoiceId);
    const url = pickInvoiceDownloadUrl(links);
    if (!url) {
      return jsonNoStore(
        { error: "Stripe n’a pas encore publié le lien de facture." },
        { status: 502 }
      );
    }

    return jsonNoStore(
      {
        url,
        format: links.invoicePdf ? "pdf" : "hosted",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[api/club/registration/invoice]", error);
    return jsonNoStore(
      { error: "Impossible de récupérer la facture" },
      { status: 500 }
    );
  }
}
