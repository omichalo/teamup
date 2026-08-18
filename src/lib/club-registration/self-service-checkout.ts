import { normalizeRegistrationPayment } from "@/lib/club-registration/payment/normalize-payment";
import {
  resolveOnlinePayableCents,
  resolveRemainingPayableCents,
} from "@/lib/club-registration/payment/resolve-remaining-payable";
import { isRegistrationPaidRecord } from "@/lib/club-registration/payment-proof";
import type { PaymentMethodId } from "@/lib/club-registration/payment-constants";

export type SelfServiceCheckoutRecord = Record<string, unknown> & {
  status?: string;
  paymentStatus?: string;
  paymentAmountCents?: number;
};

export function resolveRegistrationPaymentMethod(
  data: SelfServiceCheckoutRecord
): PaymentMethodId | null {
  const payment = normalizeRegistrationPayment(data);
  return payment?.paymentMethod ?? null;
}

function isSelfServiceEligible(data: SelfServiceCheckoutRecord): boolean {
  return data.status === "payment_requested" && !isRegistrationPaidRecord(data);
}

/** Montant Stripe par défaut : complément, sans la part CV encore due. */
export function resolveSelfServicePayableCents(data: SelfServiceCheckoutRecord): number {
  const payment = normalizeRegistrationPayment(data);
  if (payment) {
    return resolveOnlinePayableCents(payment);
  }
  if (typeof data.paymentAmountCents === "number" && data.paymentAmountCents > 0) {
    return data.paymentAmountCents;
  }
  return 0;
}

export function canSelfServiceOnlineCheckout(data: SelfServiceCheckoutRecord): boolean {
  return isSelfServiceEligible(data) && resolveSelfServicePayableCents(data) > 0;
}

/** Tout le solde par carte, si une part CV n'a pas (encore) été remise. */
export function canSelfServiceRemainingOverride(data: SelfServiceCheckoutRecord): boolean {
  if (!isSelfServiceEligible(data)) {
    return false;
  }
  const payment = normalizeRegistrationPayment(data);
  if (!payment) {
    return false;
  }
  const remaining = resolveRemainingPayableCents(payment);
  return remaining > 0 && remaining > resolveOnlinePayableCents(payment);
}

export function canSelfServiceCheckout(data: SelfServiceCheckoutRecord): boolean {
  return canSelfServiceOnlineCheckout(data) || canSelfServiceRemainingOverride(data);
}

export function isAwaitingNonCardPayment(data: SelfServiceCheckoutRecord): boolean {
  if (canSelfServiceCheckout(data)) {
    return false;
  }
  if (!isSelfServiceEligible(data)) {
    return false;
  }
  const method = resolveRegistrationPaymentMethod(data);
  const payment = normalizeRegistrationPayment(data);
  const remaining = payment ? resolveRemainingPayableCents(payment) : 0;
  return method != null && method !== "card" && remaining > 0;
}
