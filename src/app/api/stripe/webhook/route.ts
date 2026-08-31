export const runtime = "nodejs";

import { FieldValue } from "firebase-admin/firestore";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/auth/audit-logger";
import { dispatchPaymentConfirmedEmail } from "@/lib/email/dispatch-payment-confirmed-email";
import { verifyStripeWebhookSignature } from "@/lib/club-registration/stripe";
import { normalizeRegistrationPayment } from "@/lib/club-registration/payment/normalize-payment";
import { applyStripeCheckoutPaid } from "@/lib/club-registration/payment/apply-stripe-checkout-paid";
import { resolveJerseyFollowUpAfterSettlement } from "@/lib/club-registration/payment/registration-supplement";
import { paymentWriteWithSettlement } from "@/lib/club-registration/payment/settlement-firestore";
import { syncRosterAfterRegistrationChange } from "@/lib/championship/sync-after-registration";

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

    const applied = await db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      const existing = snap.data() ?? {};
      const amountTotal =
        typeof session?.amount_total === "number" ? session.amount_total : undefined;
      const existingStatus = typeof existing.status === "string" ? existing.status : undefined;
      const result = applyStripeCheckoutPaid({
        payment: normalizeRegistrationPayment(existing),
        ...(existingStatus ? { existingStatus } : {}),
        ...(session?.id ? { sessionId: session.id } : {}),
        ...(amountTotal != null ? { amountTotal } : {}),
      });

      if (result.duplicate) {
        return { ...result, existing, amountCents: amountTotal ?? 0 };
      }

      if (result.ignored) {
        return { ...result, existing, amountCents: 0 };
      }

      const paymentUpdate = result.payment
        ? paymentWriteWithSettlement(result.payment)
        : result.markRegistrationPaid
          ? { paymentStatus: "paid", status: "paid", paidAt: FieldValue.serverTimestamp() }
          : {};

      const jerseyStatus = result.markRegistrationPaid
        ? resolveJerseyFollowUpAfterSettlement(existing)
        : undefined;

      tx.set(
        docRef,
        {
          ...paymentUpdate,
          ...(result.markRegistrationPaid
            ? { status: "paid", paidAt: FieldValue.serverTimestamp() }
            : {}),
          ...(jerseyStatus ? { jerseyFollowUpStatus: jerseyStatus } : {}),
          stripeCheckoutSessionId: session?.id ?? null,
          stripeInvoiceId: session?.invoice ?? null,
          stripePaymentUrl: null,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return {
        ...result,
        existing,
        amountCents: amountTotal && amountTotal > 0 ? amountTotal : 0,
      };
    });

    if (applied.duplicate) {
      return jsonNoStore({ received: true, duplicate: true }, { status: 200 });
    }
    if (applied.ignored) {
      return jsonNoStore({ received: true, ignored: applied.ignored }, { status: 200 });
    }

    logAuditAction(AUDIT_ACTIONS.CLUB_REGISTRATION_PAYMENT_CONFIRMED, "stripe", {
      resource: "clubRegistration",
      resourceId: registrationId,
      details: {
        eventId: event.id,
        checkoutSessionId: session?.id,
        amountCents: applied.amountCents,
        settled: applied.markRegistrationPaid,
        checkoutKind: session?.metadata?.checkoutKind ?? "full",
        donationCents: session?.metadata?.donationCents,
        donationDiscountCents: session?.metadata?.donationDiscountCents,
      },
      success: true,
    });

    await syncRosterAfterRegistrationChange(getFirestoreAdmin(), registrationId);

    if (applied.amountCents > 0 && applied.markRegistrationPaid) {
      try {
        await dispatchPaymentConfirmedEmail({
          registrationId,
          data: {
            ...applied.existing,
            stripeInvoiceId: session?.invoice ?? applied.existing.stripeInvoiceId,
          },
          amountCents: applied.amountCents,
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
