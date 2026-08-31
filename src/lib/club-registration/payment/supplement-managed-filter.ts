import { normalizeRegistrationPayment } from "./normalize-payment";
import { isRegistrationSupplementDue } from "./registration-supplement";

export type ManagedListPaymentSupplementFilter = "all" | "due";

export const MANAGED_LIST_PAYMENT_SUPPLEMENT_FILTER_OPTIONS: {
  value: ManagedListPaymentSupplementFilter;
  label: string;
  hint?: string;
}[] = [
  { value: "all", label: "Tous" },
  {
    value: "due",
    label: "Complément dû",
    hint: "Paiement initial enregistré, reliquat encore ouvert.",
  },
];

export const PAYMENT_SUPPLEMENT_CARD_LABEL = "Complément dû";

export function resolveManagedListPaymentSupplementFilter(
  value: string | null | undefined
): ManagedListPaymentSupplementFilter {
  if (value === "due") {
    return "due";
  }
  return "all";
}

export function summaryHasPaymentSupplementDue(summary: Record<string, unknown>): boolean {
  const payment = normalizeRegistrationPayment(summary);
  return payment != null && isRegistrationSupplementDue(payment);
}

export function matchesPaymentSupplementFilter(
  summary: Record<string, unknown>,
  filter: ManagedListPaymentSupplementFilter
): boolean {
  if (filter === "all") {
    return true;
  }
  return summaryHasPaymentSupplementDue(summary);
}
