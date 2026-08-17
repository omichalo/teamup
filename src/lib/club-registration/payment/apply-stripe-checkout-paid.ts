import { addManualReceivedPayment } from "@/lib/club-registration/payment/payment-mutations";
import type { RegistrationPayment } from "@/lib/club-registration/payment/types";

const STRIPE_CHECKOUT_NOTE_PREFIX = "Checkout ";

export function stripeCheckoutReceiptNote(sessionId: string): string {
  return `${STRIPE_CHECKOUT_NOTE_PREFIX}${sessionId}`;
}

export function hasStripeCheckoutReceipt(
  payment: RegistrationPayment,
  sessionId: string | undefined
): boolean {
  if (!sessionId) {
    return false;
  }
  const needle = stripeCheckoutReceiptNote(sessionId);
  return payment.receivedPayments.some(
    (line) => line.recordedBy === "stripe" && line.note === needle
  );
}

export type ApplyStripeCheckoutPaidInput = {
  existingStatus?: string;
  payment: RegistrationPayment | null;
  sessionId?: string;
  amountTotal?: number;
};

export type ApplyStripeCheckoutPaidResult = {
  duplicate: boolean;
  ignored?: string;
  payment: RegistrationPayment | null;
  markRegistrationPaid: boolean;
};

/**
 * Applique un Checkout Stripe payé au modèle Payment.
 * N'écrase pas `paymentMethod`. N'invente pas de complément de solde.
 */
export function applyStripeCheckoutPaid(
  input: ApplyStripeCheckoutPaidInput
): ApplyStripeCheckoutPaidResult {
  if (input.payment && hasStripeCheckoutReceipt(input.payment, input.sessionId)) {
    return {
      duplicate: true,
      payment: input.payment,
      markRegistrationPaid: input.payment.remainingAmountCents === 0,
    };
  }

  if (
    input.existingStatus === "paid" &&
    (!input.payment || input.payment.remainingAmountCents === 0)
  ) {
    return { duplicate: true, payment: input.payment, markRegistrationPaid: true };
  }

  const amountCents =
    typeof input.amountTotal === "number" && input.amountTotal > 0 ? input.amountTotal : 0;

  if (amountCents <= 0) {
    return {
      duplicate: false,
      ignored: "missing stripe amount",
      payment: input.payment,
      markRegistrationPaid: false,
    };
  }

  if (!input.payment) {
    return { duplicate: false, payment: null, markRegistrationPaid: true };
  }

  const payment = addManualReceivedPayment(input.payment, {
    method: "card",
    label: "Paiement Stripe",
    amountCents,
    receivedAt: new Date().toISOString(),
    recordedBy: "stripe",
    ...(input.sessionId ? { note: stripeCheckoutReceiptNote(input.sessionId) } : {}),
  });

  return {
    duplicate: false,
    payment,
    markRegistrationPaid:
      payment.remainingAmountCents === 0 && payment.paymentStatus === "paid",
  };
}
