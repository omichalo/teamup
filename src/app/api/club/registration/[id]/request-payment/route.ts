export const runtime = "nodejs";

import { cookies } from "next/headers";
import { FieldValue, type DocumentData } from "firebase-admin/firestore";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { adminAuth, getFirestoreAdmin } from "@/lib/firebase-admin";
import { hasAnyRole, resolveRole, USER_ROLES } from "@/lib/auth/roles";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { sendMail } from "@/lib/mailer";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/auth/audit-logger";
import {
  createMembershipCheckoutSession,
  getAppBaseUrl,
} from "@/lib/club-registration/stripe";

const COLLECTION = "clubRegistrations";
const MANAGER_ROLES = [USER_ROLES.ADMIN, USER_ROLES.SECRETARY] as const;

function formatEuros(amountCents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amountCents / 100);
}

function resolvePaymentEmail(data: DocumentData): string | null {
  if (typeof data.adherentEmail === "string" && data.adherentEmail.includes("@")) {
    return data.adherentEmail;
  }
  if (
    Array.isArray(data.representatives) &&
    typeof data.representatives[0]?.email === "string" &&
    data.representatives[0].email.includes("@")
  ) {
    return data.representatives[0].email;
  }
  if (
    typeof data.submitterAccountEmail === "string" &&
    data.submitterAccountEmail.includes("@")
  ) {
    return data.submitterAccountEmail;
  }
  return null;
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
    const amountCents = body.amountCents ?? data.paymentAmountCents;
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      return jsonNoStore(
        { error: "Indiquez un montant strictement positif avant de demander le paiement." },
        { status: 400 }
      );
    }

    const paymentEmail = resolvePaymentEmail(data);
    if (!paymentEmail) {
      return jsonNoStore(
        { error: "Aucune adresse e-mail exploitable pour envoyer la demande de paiement." },
        { status: 400 }
      );
    }

    const adherentName = `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim() || "adhérent";
    const baseUrl = getAppBaseUrl(req);
    const session = await createMembershipCheckoutSession({
      registrationId: id,
      amountCents,
      customerEmail: paymentEmail,
      adherentName,
      successUrl: `${baseUrl}/club/mes-inscriptions?payment=success&registration=${encodeURIComponent(id)}`,
      cancelUrl: `${baseUrl}/club/mes-inscriptions?payment=cancelled&registration=${encodeURIComponent(id)}`,
    });

    if (!session.url) {
      return jsonNoStore(
        { error: "Stripe n'a pas retourné de lien de paiement." },
        { status: 502 }
      );
    }

    await docRef.set(
      {
        status: "payment_requested",
        paymentAmountCents: amountCents,
        paymentStatus: "pending",
        paymentRequestedAt: FieldValue.serverTimestamp(),
        paymentRequestedBy: decoded.uid,
        paymentEmailSentTo: paymentEmail,
        stripeCheckoutSessionId: session.id,
        stripeCheckoutUrl: session.url,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await sendMail({
      to: paymentEmail,
      subject: `Paiement de votre adhésion SQY Ping - ${adherentName}`,
      text: [
        `Bonjour,`,
        ``,
        `Votre dossier d'adhésion SQY Ping a été relu et validé administrativement.`,
        `Montant à régler : ${formatEuros(amountCents)}.`,
        ``,
        `Vous pouvez procéder au paiement sécurisé Stripe ici : ${session.url}`,
        ``,
        `Une facture pourra être générée par Stripe après paiement.`,
        ``,
        `SQY Ping TeamUp`,
      ].join("\n"),
      html: `
        <p>Bonjour,</p>
        <p>Votre dossier d'adhésion SQY Ping a été relu et validé administrativement.</p>
        <p><strong>Montant à régler : ${formatEuros(amountCents)}</strong></p>
        <p><a href="${session.url}">Procéder au paiement sécurisé Stripe</a></p>
        <p>Une facture pourra être générée par Stripe après paiement.</p>
        <p>SQY Ping TeamUp</p>
      `,
    });

    logAuditAction(AUDIT_ACTIONS.CLUB_REGISTRATION_PAYMENT_REQUESTED, decoded.uid, {
      resource: "clubRegistration",
      resourceId: id,
      details: { amountCents, stripeCheckoutSessionId: session.id },
      success: true,
    });

    return jsonNoStore({ success: true, checkoutUrl: session.url }, { status: 200 });
  } catch (error) {
    console.error("[api/club/registration/request-payment]", error);
    return jsonNoStore(
      { error: error instanceof Error ? error.message : "Impossible de demander le paiement" },
      { status: 500 }
    );
  }
}
