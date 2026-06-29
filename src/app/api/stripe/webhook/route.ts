export const runtime = "nodejs";

import { FieldValue } from "firebase-admin/firestore";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/auth/audit-logger";
import { dispatchPaymentConfirmedEmail } from "@/lib/email/dispatch-payment-confirmed-email";
import { verifyStripeWebhookSignature } from "@/lib/club-registration/stripe";
import {
  normalizeRegistrationPayment,
  paymentToFirestoreUpdate,
} from "@/lib/club-registration/payment/normalize-payment";
import {
  addManualReceivedPayment,
  markPaymentFullyPaid,
} from "@/lib/club-registration/payment/payment-mutations";

type StripeWebhookEvent = {
  id: string;
  type: string;
  data?: {
    object?: {
      id?: string;
      payment_status?: string;
      amount_total?: number;
      client_reference_id?: string;
      invoice?: string;
      metadata?: Record<string, string>;
    };
  };
};

const STRIPE_PAID_CHECKOUT_STATUSES = new Set(["paid", "no_payment_required"]);

function resolveStripeCheckoutPaidAmountCents(
  session: NonNullable<StripeWebhookEvent["data"]>["object"],
  existing: Record<string, unknown>,
  basePaymentAmountToPayCents: number | null
): number {
  if (typeof session?.amount_total === "number" && session.amount_total > 0) {
    return session.amount_total;
  }
  if (typeof existing.paymentAmountCents === "number" && existing.paymentAmountCents > 0) {
    return existing.paymentAmountCents;
  }
  return basePaymentAmountToPayCents ?? 0;
}

export async function POST(req: Request) {
  try {
    const payload = await req.text();
    if (!verifyStripeWebhookSignature(payload, req.headers.get("stripe-signature"))) {
      return jsonNoStore({ error: "Signature Stripe invalide" }, { status: 400 });
    }

    const event = JSON.parse(payload) as StripeWebhookEvent;
    if (event.type !== "checkout.session.completed") {
      return jsonNoStore({ received: true }, { status: 200 });
    }

    const session = event.data?.object;
    const stripePaymentStatus = session?.payment_status;
    if (
      stripePaymentStatus &&
      !STRIPE_PAID_CHECKOUT_STATUSES.has(stripePaymentStatus)
    ) {
      return jsonNoStore(
        { received: true, ignored: "checkout completed but payment not settled" },
        { status: 200 }
      );
    }
    const registrationId =
      session?.metadata?.registrationId || session?.client_reference_id || null;
    if (!registrationId) {
      return jsonNoStore({ received: true, ignored: "missing registration id" }, { status: 200 });
    }

    const db = getFirestoreAdmin();
    const docRef = db.collection("clubRegistrations").doc(registrationId);
    const snap = await docRef.get();
    const existing = snap.data() ?? {};
    if (existing.status === "paid") {
      return jsonNoStore({ received: true, duplicate: true }, { status: 200 });
    }

    const basePayment = normalizeRegistrationPayment(existing);
    const amountCents = resolveStripeCheckoutPaidAmountCents(
      session,
      existing,
      basePayment?.amountToPayCents ?? null
    );

    let payment = basePayment;
    if (payment) {
      if (amountCents > 0) {
        payment = addManualReceivedPayment(payment, {
          method: "card",
          label: "Paiement Stripe",
          amountCents,
          receivedAt: new Date().toISOString(),
          recordedBy: "stripe",
          ...(session?.id ? { note: `Checkout ${session.id}` } : {}),
        });
      }
      payment = markPaymentFullyPaid(payment, {
        recordedBy: "stripe",
        ...(session?.id ? { note: `Checkout ${session.id}` } : {}),
      });
    }

    await docRef.set(
      {
        status: "paid",
        stripeCheckoutSessionId: session?.id ?? null,
        stripeInvoiceId: session?.invoice ?? null,
        stripePaymentUrl: null,
        paidAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        ...(payment ? paymentToFirestoreUpdate(payment) : { paymentStatus: "paid" }),
      },
      { merge: true }
    );

    logAuditAction(AUDIT_ACTIONS.CLUB_REGISTRATION_PAYMENT_CONFIRMED, "stripe", {
      resource: "clubRegistration",
      resourceId: registrationId,
      details: {
        eventId: event.id,
        checkoutSessionId: session?.id,
        donationCents: session?.metadata?.donationCents,
        donationDiscountCents: session?.metadata?.donationDiscountCents,
      },
      success: true,
    });

    if (amountCents > 0) {
      try {
        await dispatchPaymentConfirmedEmail({
          registrationId,
          data: {
            ...existing,
            stripeInvoiceId: session?.invoice ?? existing.stripeInvoiceId,
          },
          amountCents,
          source: "stripe",
        });
      } catch (emailError) {
        console.error("[api/stripe/webhook] payment confirmed email", emailError);
      }
    }

    return jsonNoStore({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[api/stripe/webhook]", error);
    return jsonNoStore({ error: "Webhook Stripe impossible à traiter" }, { status: 500 });
  }
}
