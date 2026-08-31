export const runtime = "nodejs";

import { FieldValue } from "firebase-admin/firestore";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/auth/audit-logger";
import { requireRegistrationManager } from "@/lib/club-registration/payment/api-auth";
import {
  normalizeRegistrationPayment,
  paymentToFirestoreUpdate,
} from "@/lib/club-registration/payment/normalize-payment";
import {
  assertCanRequestRemainingCardPayment,
  createRemainingBalanceCheckoutSession,
  preparePaymentForRemainingCardCheckout,
} from "@/lib/club-registration/payment/create-remaining-balance-checkout";
import { getAppBaseUrl } from "@/lib/club-registration/stripe";
import {
  formatRegistrationPaymentEmailsForStorage,
  resolveRegistrationPaymentRecipientEmails,
} from "@/lib/club-registration/resolve-registration-contact-email";
import { formatPersonDisplayName } from "@/lib/shared/person-name-format";
import {
  buildRemainingBalancePaymentEmail,
  buildRemainingBalancePaymentEmailSubject,
} from "@/lib/email/remaining-balance-payment-email";
import { getSqyPingLogoAttachment } from "@/lib/email/logo-attachment";
import { sendMail } from "@/lib/mailer";

const COLLECTION = "clubRegistrations";

/**
 * POST /api/club/registration/[id]/payment/request-remaining-card
 * Crée un Checkout Stripe sur le reste dû et envoie le lien à l’adhérent.
 */
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!validateOrigin(req)) {
      return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
    }

    const auth = await requireRegistrationManager();
    if (!auth.ok) {
      return jsonNoStore({ error: auth.error }, { status: auth.status });
    }

    const { id } = await context.params;
    const db = getFirestoreAdmin();
    const docRef = db.collection(COLLECTION).doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return jsonNoStore({ error: "Dossier introuvable" }, { status: 404 });
    }

    const data = snap.data() ?? {};
    const payment = normalizeRegistrationPayment(data);
    const gate = assertCanRequestRemainingCardPayment({
      payment,
      registrationData: data as Record<string, unknown>,
    });
    if (!gate.ok) {
      return jsonNoStore({ error: gate.error }, { status: 400 });
    }

    const paymentEmails = resolveRegistrationPaymentRecipientEmails(data);
    const paymentEmail = paymentEmails[0] ?? null;
    if (!paymentEmail) {
      return jsonNoStore(
        {
          error:
            "Aucune adresse e-mail exploitable pour envoyer le lien de paiement du solde.",
        },
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

    const preparedPayment = preparePaymentForRemainingCardCheckout(payment!);
    const session = await createRemainingBalanceCheckoutSession({
      registrationId: id,
      remainingAmountCents: gate.remainingAmountCents,
      customerEmail: paymentEmail,
      adherentName,
      successUrl,
      cancelUrl,
    });

    if (!session.url) {
      return jsonNoStore(
        { error: "Stripe n’a pas renvoyé d’URL de paiement." },
        { status: 502 }
      );
    }

    await docRef.set(
      {
        status: "payment_requested",
        ...paymentToFirestoreUpdate(preparedPayment),
        stripeCheckoutSessionId: session.id,
        stripeCheckoutUrl: session.url,
        paymentEmailSentTo: formatRegistrationPaymentEmailsForStorage(paymentEmails),
        paymentRequestedAt: FieldValue.serverTimestamp(),
        paymentRequestedBy: auth.uid,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const mail = buildRemainingBalancePaymentEmail({
      adherentName,
      remainingAmountCents: gate.remainingAmountCents,
      paidAmountCents: preparedPayment.paidAmountCents,
      amountToPayCents: preparedPayment.amountToPayCents,
      checkoutUrl: session.url,
      appOrigin: baseUrl,
      originalPaymentMethod: preparedPayment.paymentMethod,
    });

    await sendMail({
      to: paymentEmails,
      subject: buildRemainingBalancePaymentEmailSubject(adherentName),
      html: mail.html,
      text: mail.text,
      attachments: [getSqyPingLogoAttachment()],
    });

    logAuditAction(AUDIT_ACTIONS.CLUB_REGISTRATION_PAYMENT_REQUESTED, auth.uid, {
      resource: "clubRegistration",
      resourceId: id,
      details: {
        action: "request_remaining_card",
        remainingAmountCents: gate.remainingAmountCents,
        originalPaymentMethod: preparedPayment.paymentMethod,
        checkoutSessionId: session.id,
      },
      success: true,
    });

    return jsonNoStore(
      {
        success: true,
        payment: preparedPayment,
        remainingAmountCents: gate.remainingAmountCents,
        checkoutUrl: session.url,
        checkoutSessionId: session.id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[api/club/registration/payment/request-remaining-card POST]", error);
    return jsonNoStore(
      { error: "Impossible d’envoyer le lien CB pour le reste dû" },
      { status: 500 }
    );
  }
}
