import type { ReceivedPaymentMethodId } from "@/lib/club-registration/payment-constants";

export const PAYMENT_REFERENCE_MAX_LENGTH = 80;

export function paymentReferenceFieldLabel(
  method: ReceivedPaymentMethodId | null | undefined
): string {
  if (method === "holiday_vouchers") {
    return "N° de chèque(s) vacances (optionnel)";
  }
  if (method === "cheque") {
    return "N° de chèque (optionnel)";
  }
  return "Référence (optionnel)";
}

export function normalizePaymentReference(
  value: unknown
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim().slice(0, PAYMENT_REFERENCE_MAX_LENGTH);
  return trimmed.length > 0 ? trimmed : undefined;
}
