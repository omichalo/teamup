import type { RegistrationPayment } from "./types";

/**
 * Montant réellement encore dû (tous moyens confondus).
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

/**
 * Part chèques vacances encore prévue et non encaissée.
 * Par défaut cette part n'est pas demandée sur Stripe (remise physique au club).
 * Un encaissement Stripe « remaining » peut quand même la couvrir si l'adhérent change d'avis.
 */
export function resolveUnpaidHolidayVoucherCents(
  payment: RegistrationPayment | null | undefined
): number {
  if (!payment) {
    return 0;
  }
  const declared = Math.max(0, payment.holidayVoucherAmountCents ?? 0);
  if (declared <= 0) {
    return 0;
  }
  const received = payment.receivedPayments
    .filter((line) => line.method === "holiday_vouchers")
    .reduce((sum, line) => sum + Math.max(0, line.amountCents), 0);
  const outstanding = Math.max(0, declared - received);
  return Math.min(outstanding, resolveRemainingPayableCents(payment));
}

/**
 * Montant à encaisser en ligne par défaut : solde moins les CV encore dus.
 * Sans chèques vacances déclarés, égal au solde (chèque → lien CB sur tout le reste).
 */
export function resolveOnlinePayableCents(
  payment: RegistrationPayment | null | undefined
): number {
  const remaining = resolveRemainingPayableCents(payment);
  return Math.max(0, remaining - resolveUnpaidHolidayVoucherCents(payment));
}

export type CheckoutChargeAmounts = {
  amountToPayCents: number;
  alreadyPaidCents: number;
  remainingPayableCents: number;
  onlinePayableCents: number;
  reservedHolidayVoucherCents: number;
};

/**
 * Distingue le net après aides, le solde total, et ce que Stripe peut demander maintenant.
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
  const reservedHolidayVoucherCents = payment
    ? resolveUnpaidHolidayVoucherCents(payment)
    : 0;
  const onlinePayableCents = payment
    ? resolveOnlinePayableCents(payment)
    : remainingPayableCents;

  return {
    amountToPayCents,
    alreadyPaidCents,
    remainingPayableCents,
    onlinePayableCents,
    reservedHolidayVoucherCents,
  };
}

export type StripeChargeMode = "online" | "remaining";

export function parseStripeChargeMode(value: unknown): StripeChargeMode {
  return value === "remaining" ? "remaining" : "online";
}

/**
 * `online` = complément (solde − CV encore dus).
 * `remaining` = tout le reste dû, si l'adhérent ne remet pas les chèques vacances.
 */
export function resolveStripeChargeForMode(
  charge: CheckoutChargeAmounts,
  mode: StripeChargeMode
): { stripeCents: number; reservedHolidayVoucherCents: number } {
  if (mode === "remaining") {
    return {
      stripeCents: charge.remainingPayableCents,
      reservedHolidayVoucherCents: 0,
    };
  }
  return {
    stripeCents: charge.onlinePayableCents,
    reservedHolidayVoucherCents: charge.reservedHolidayVoucherCents,
  };
}
