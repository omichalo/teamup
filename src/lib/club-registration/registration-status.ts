export const REGISTRATION_STATUS_VALUES = [
  "submitted",
  "in_review",
  "payment_requested",
  "paid",
  "approved",
  "cancelled",
] as const;

export type RegistrationStatus = (typeof REGISTRATION_STATUS_VALUES)[number];

/** Dossiers nécessitant une action du secrétariat. */
export const ACTIONABLE_REGISTRATION_STATUSES: RegistrationStatus[] = [
  "submitted",
  "in_review",
  "payment_requested",
];

/** Statuts terminaux hors parcours actif (hors effectifs / nouvelle inscription). */
export const TERMINAL_INACTIVE_REGISTRATION_STATUSES: RegistrationStatus[] = ["cancelled"];

export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  submitted: "A relire",
  in_review: "En relecture",
  payment_requested: "Paiement demandé",
  paid: "Payé",
  approved: "Validé sans paiement",
  cancelled: "Annulé",
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
  cancelled: "error",
};

export type ManagedListStatusFilter = "actionable" | "all" | RegistrationStatus;

export function isRegistrationStatus(value: string): value is RegistrationStatus {
  return (REGISTRATION_STATUS_VALUES as readonly string[]).includes(value);
}

/**
 * Mappe un statut stocké (y compris legacy `rejected`) vers le statut canonique.
 */
export function coerceRegistrationStatus(
  value: string | null | undefined
): RegistrationStatus | null {
  if (!value) return null;
  if (value === "rejected") return "cancelled";
  if (isRegistrationStatus(value)) return value;
  return null;
}

export function isTerminalInactiveRegistrationStatus(
  status: string | null | undefined
): boolean {
  return coerceRegistrationStatus(status) === "cancelled";
}

export function registrationStatusLabel(value: string | null | undefined): string {
  const known = coerceRegistrationStatus(value);
  if (known) return REGISTRATION_STATUS_LABELS[known];
  return value?.trim() ? value : "Statut inconnu";
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
  const coerced = coerceRegistrationStatus(value);
  if (coerced) {
    return coerced;
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
  { value: "cancelled", label: REGISTRATION_STATUS_LABELS.cancelled },
  { value: "all", label: "Tous" },
];
