import {
  type PaymentStatusId,
} from "@/lib/club-registration/payment-constants";

/**
 * Filtres paiement compactés pour la liste validations licence.
 * `partially_paid` est isolé ; le reste du non soldé est regroupé
 * (aligné sur la vue tableau « Paiement en attente », hors partiel).
 */
export const LICENSE_VALIDATION_PAYMENT_FILTER_VALUES = [
  "all",
  "paid",
  "partially_paid",
  "unpaid",
] as const;

export type LicenseValidationPaymentListFilter =
  (typeof LICENSE_VALIDATION_PAYMENT_FILTER_VALUES)[number];

export const LICENSE_VALIDATION_PAYMENT_FILTER_LABELS: Record<
  LicenseValidationPaymentListFilter,
  string
> = {
  all: "Tous",
  paid: "Payé",
  partially_paid: "Partiel",
  unpaid: "En attente",
};

const UNPAID_PAYMENT_STATUSES: ReadonlySet<PaymentStatusId> = new Set([
  "pending_validation",
  "waiting_payment",
  "manual_follow_up",
]);

export function resolveLicenseValidationPaymentListFilter(
  raw: string | null | undefined
): LicenseValidationPaymentListFilter {
  if (
    raw === "paid" ||
    raw === "partially_paid" ||
    raw === "unpaid" ||
    raw === "all"
  ) {
    return raw;
  }
  return "all";
}

export function matchesPaymentStatusFilter(
  paymentStatus: PaymentStatusId | null,
  filter: LicenseValidationPaymentListFilter
): boolean {
  if (filter === "all") {
    return true;
  }
  if (filter === "paid") {
    return paymentStatus === "paid";
  }
  if (filter === "partially_paid") {
    return paymentStatus === "partially_paid";
  }
  if (paymentStatus == null) {
    return false;
  }
  return UNPAID_PAYMENT_STATUSES.has(paymentStatus);
}
