import {
  PAYMENT_STATUS_IDS,
  type PaymentStatusId,
} from "@/lib/club-registration/payment-constants";

type PaymentStatusRecord = Record<string, unknown>;

/**
 * Statut de paiement affiché / filtré, en tenant compte des champs legacy Firestore
 * (`pending`, `complete`) et des indicateurs de règlement effectif (`paidAt`, `status`).
 */
export function resolveRegistrationPaymentStatus(
  record: PaymentStatusRecord
): PaymentStatusId | null {
  if (record.status === "paid" || record.paidAt != null) {
    return "paid";
  }

  const raw = record.paymentStatus;
  if (typeof raw !== "string" || !raw) {
    return null;
  }

  if (raw === "complete" || raw === "paid") {
    return "paid";
  }

  if (raw === "pending") {
    return "waiting_payment";
  }

  if ((PAYMENT_STATUS_IDS as readonly string[]).includes(raw)) {
    return raw as PaymentStatusId;
  }

  return null;
}
