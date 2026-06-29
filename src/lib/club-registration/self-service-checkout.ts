import { normalizeRegistrationPayment } from "@/lib/club-registration/payment/normalize-payment";
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

export function resolveSelfServicePayableCents(data: SelfServiceCheckoutRecord): number {
  const payment = normalizeRegistrationPayment(data);
  if (payment && payment.amountToPayCents > 0) {
    return payment.amountToPayCents;
  }
  if (typeof data.paymentAmountCents === "number" && data.paymentAmountCents > 0) {
    return data.paymentAmountCents;
  }
  return 0;
}

export function canSelfServiceCheckout(data: SelfServiceCheckoutRecord): boolean {
  if (data.status !== "payment_requested") {
    return false;
  }
  if (isRegistrationPaidRecord(data)) {
    return false;
  }
  if (resolveRegistrationPaymentMethod(data) !== "card") {
    return false;
  }
  return resolveSelfServicePayableCents(data) > 0;
}

export function isAwaitingNonCardPayment(data: SelfServiceCheckoutRecord): boolean {
  if (data.status !== "payment_requested" || isRegistrationPaidRecord(data)) {
    return false;
  }
  const method = resolveRegistrationPaymentMethod(data);
  return method != null && method !== "card" && resolveSelfServicePayableCents(data) > 0;
}
