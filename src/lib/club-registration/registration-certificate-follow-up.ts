/**
 * Suivi secrétariat de l’envoi de l’attestation d’inscription.
 * Distinct de la demande adhérent (`wantsRegistrationCertificate`).
 */

export const REGISTRATION_CERTIFICATE_FOLLOW_UP_STATUS_VALUES = [
  "not_applicable",
  "to_do",
  "sent",
] as const;

export type RegistrationCertificateFollowUpStatus =
  (typeof REGISTRATION_CERTIFICATE_FOLLOW_UP_STATUS_VALUES)[number];

export const REGISTRATION_CERTIFICATE_FOLLOW_UP_STATUS_LABELS: Record<
  RegistrationCertificateFollowUpStatus,
  string
> = {
  not_applicable: "Non applicable",
  to_do: "À faire",
  sent: "Envoyée",
};

export function isRegistrationCertificateRequested(wantsCertificate: unknown): boolean {
  return wantsCertificate === true;
}

export function isRegistrationCertificateFollowUpStatus(
  value: unknown
): value is RegistrationCertificateFollowUpStatus {
  return REGISTRATION_CERTIFICATE_FOLLOW_UP_STATUS_VALUES.includes(
    value as RegistrationCertificateFollowUpStatus
  );
}

export function initialRegistrationCertificateFollowUpStatus(
  wantsCertificate: unknown
): RegistrationCertificateFollowUpStatus {
  return isRegistrationCertificateRequested(wantsCertificate)
    ? "to_do"
    : "not_applicable";
}

export function normalizeRegistrationCertificateFollowUpStatus(
  status: unknown,
  wantsCertificate: unknown
): RegistrationCertificateFollowUpStatus {
  if (!isRegistrationCertificateRequested(wantsCertificate)) {
    return "not_applicable";
  }
  if (isRegistrationCertificateFollowUpStatus(status) && status !== "not_applicable") {
    return status;
  }
  return "to_do";
}

export function resolveRegistrationCertificateFollowUpStatusForPatch(params: {
  wantsCertificate: unknown;
  currentStatus: unknown;
  requestedStatus: unknown;
}): RegistrationCertificateFollowUpStatus {
  const requested =
    params.requestedStatus === undefined
      ? params.currentStatus
      : params.requestedStatus;
  return normalizeRegistrationCertificateFollowUpStatus(
    requested,
    params.wantsCertificate
  );
}

export type ManagedListRegistrationCertificateFollowUpFilter =
  | "all"
  | Exclude<RegistrationCertificateFollowUpStatus, "not_applicable">;

export const MANAGED_LIST_REGISTRATION_CERTIFICATE_FOLLOW_UP_FILTER_OPTIONS: {
  value: ManagedListRegistrationCertificateFollowUpFilter;
  label: string;
  hint?: string;
}[] = [
  { value: "all", label: "Tous" },
  {
    value: "to_do",
    label: "À faire",
    hint: "Attestation demandée, pas encore envoyée.",
  },
  {
    value: "sent",
    label: "Envoyée",
    hint: "Attestation d’inscription envoyée à l’adhérent.",
  },
];

export const REGISTRATION_CERTIFICATE_FOLLOW_UP_CARD_LABELS: Record<
  Exclude<RegistrationCertificateFollowUpStatus, "not_applicable">,
  string
> = {
  to_do: "Attestation à envoyer",
  sent: "Attestation envoyée",
};

export function resolveManagedListRegistrationCertificateFollowUpFilter(
  value: string | null | undefined
): ManagedListRegistrationCertificateFollowUpFilter {
  if (!value || value === "all") {
    return "all";
  }
  if (value === "to_do" || value === "sent") {
    return value;
  }
  return "all";
}

export function summaryRegistrationCertificateFollowUpStatus(
  summary: Record<string, unknown>
): RegistrationCertificateFollowUpStatus {
  return normalizeRegistrationCertificateFollowUpStatus(
    summary.registrationCertificateFollowUpStatus,
    summary.wantsRegistrationCertificate
  );
}

export function matchesRegistrationCertificateFollowUpFilter(
  summary: Record<string, unknown>,
  filter: ManagedListRegistrationCertificateFollowUpFilter
): boolean {
  if (filter === "all") {
    return true;
  }
  return summaryRegistrationCertificateFollowUpStatus(summary) === filter;
}
