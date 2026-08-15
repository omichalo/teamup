import {
  REMAINING_BALANCE_CHECKOUT_KIND,
  REMAINING_BALANCE_EXPECTED_CANCEL_NOTE,
} from "@/lib/club-registration/payment/create-remaining-balance-checkout";
import {
  addManualReceivedPayment,
  cancelAllPendingExpectedPayments,
  markPaymentFullyPaid,
} from "@/lib/club-registration/payment/payment-mutations";
import type { RegistrationPayment } from "@/lib/club-registration/payment/types";

export type StripeCheckoutSessionLike = {
  id?: string;
  amount_total?: number;
  metadata?: Record<string, string>;
};

export function isRemainingBalanceCheckoutSession(
  session: StripeCheckoutSessionLike | null | undefined
): boolean {
  return session?.metadata?.checkoutKind === REMAINING_BALANCE_CHECKOUT_KIND;
}

export function resolveStripeCheckoutPaidAmountCents(params: {
  session: StripeCheckoutSessionLike | null | undefined;
  fallbackPaymentAmountCents: number | null | undefined;
  fallbackAmountToPayCents: number | null | undefined;
  remainingBalance: boolean;
}): number {
  if (typeof params.session?.amount_total === "number" && params.session.amount_total > 0) {
    return params.session.amount_total;
  }
  if (params.remainingBalance) {
    return 0;
  }
  if (
    typeof params.fallbackPaymentAmountCents === "number" &&
    params.fallbackPaymentAmountCents > 0
  ) {
    return params.fallbackPaymentAmountCents;
  }
  return params.fallbackAmountToPayCents ?? 0;
}

/**
 * Applique un Checkout Stripe au ledger paiement.
 * Pour un solde partiel : n’force le « payé » que si le reste tombe à 0.
 */
export function applyStripeCheckoutPaymentToRegistration(params: {
  payment: RegistrationPayment;
  amountCents: number;
  sessionId?: string;
  remainingBalance: boolean;
}): { payment: RegistrationPayment; fullyPaid: boolean } {
  let payment = params.payment;
  const note = params.sessionId ? `Checkout ${params.sessionId}` : undefined;

  if (params.amountCents > 0) {
    payment = addManualReceivedPayment(payment, {
      method: "card",
      label: params.remainingBalance ? "Solde — paiement Stripe" : "Paiement Stripe",
      amountCents: params.amountCents,
      receivedAt: new Date().toISOString(),
      recordedBy: "stripe",
      ...(note ? { note } : {}),
    });
  }

  if (params.remainingBalance) {
    payment = cancelAllPendingExpectedPayments(
      payment,
      REMAINING_BALANCE_EXPECTED_CANCEL_NOTE
    );
    const fullyPaid = payment.remainingAmountCents <= 0;
    if (fullyPaid) {
      payment = {
        ...payment,
        paymentStatus: "paid",
        remainingAmountCents: 0,
      };
    }
    return { payment, fullyPaid };
  }

  payment = markPaymentFullyPaid(payment, {
    recordedBy: "stripe",
    ...(note ? { note } : {}),
  });
  return { payment, fullyPaid: true };
}
