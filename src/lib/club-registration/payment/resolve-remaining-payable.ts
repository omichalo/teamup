import type { RegistrationPayment } from "./types";

/**
 * Montant réellement encore payable maintenant.
 * `amountToPayCents` = net après aides ; le solde déduit déjà les encaissements.
 */
export function resolveRemainingPayableCents(
  payment: RegistrationPayment | null | undefined
): number {
  if (!payment) {
    return 0;
  }
  return Math.max(0, payment.remainingAmountCents);
}

export type CheckoutChargeAmounts = {
  amountToPayCents: number;
  alreadyPaidCents: number;
  remainingPayableCents: number;
};

/**
 * Distingue le net après aides du solde à encaisser (Checkout, e-mails, relances).
 */
export function resolveCheckoutChargeAmounts(
  payment: RegistrationPayment | null | undefined,
  fallbackAmountToPayCents: number
): CheckoutChargeAmounts {
  const amountToPayCents = Math.max(
    0,
    payment?.amountToPayCents ?? fallbackAmountToPayCents
  );
  const alreadyPaidCents = Math.max(0, payment?.paidAmountCents ?? 0);
  const remainingPayableCents = payment
    ? resolveRemainingPayableCents(payment)
    : amountToPayCents;

  return {
    amountToPayCents,
    alreadyPaidCents,
    remainingPayableCents,
  };
}
