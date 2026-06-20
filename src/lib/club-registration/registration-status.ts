export const REGISTRATION_STATUS_VALUES = [
  "submitted",
  "in_review",
  "payment_requested",
  "paid",
  "approved",
  "rejected",
] as const;

export type RegistrationStatus = (typeof REGISTRATION_STATUS_VALUES)[number];

/** Dossiers nécessitant une action du secrétariat. */
export const ACTIONABLE_REGISTRATION_STATUSES: RegistrationStatus[] = [
  "submitted",
  "in_review",
  "payment_requested",
];

export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  submitted: "A relire",
  in_review: "En relecture",
  payment_requested: "Paiement demandé",
  paid: "Payé",
  approved: "Approuvé",
  rejected: "Refusé",
};

export const REGISTRATION_STATUS_COLORS: Record<
  RegistrationStatus,
  "default" | "info" | "warning" | "success" | "error"
> = {
  submitted: "warning",
  in_review: "info",
  payment_requested: "info",
  paid: "success",
  approved: "success",
  rejected: "error",
};

export type ManagedListStatusFilter = "actionable" | "all" | RegistrationStatus;

export function isRegistrationStatus(value: string): value is RegistrationStatus {
  return (REGISTRATION_STATUS_VALUES as readonly string[]).includes(value);
}

export function resolveManagedListStatusFilter(
  value: string | null | undefined
): ManagedListStatusFilter {
  if (!value || value === "actionable") {
    return "actionable";
  }
  if (value === "all") {
    return "all";
  }
  if (isRegistrationStatus(value)) {
    return value;
  }
  return "actionable";
}

export const MANAGED_LIST_STATUS_FILTER_OPTIONS: {
  value: ManagedListStatusFilter;
  label: string;
}[] = [
  { value: "actionable", label: "A traiter" },
  { value: "submitted", label: REGISTRATION_STATUS_LABELS.submitted },
  { value: "in_review", label: REGISTRATION_STATUS_LABELS.in_review },
  { value: "payment_requested", label: REGISTRATION_STATUS_LABELS.payment_requested },
  { value: "paid", label: REGISTRATION_STATUS_LABELS.paid },
  { value: "approved", label: REGISTRATION_STATUS_LABELS.approved },
  { value: "rejected", label: REGISTRATION_STATUS_LABELS.rejected },
  { value: "all", label: "Tous" },
];
