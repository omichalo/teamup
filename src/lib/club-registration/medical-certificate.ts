export const MEDICAL_CERTIFICATE_STATUS_VALUES = [
  "not_required",
  "required_not_received",
  "received",
  "validated",
] as const;

export type MedicalCertificateStatus =
  (typeof MEDICAL_CERTIFICATE_STATUS_VALUES)[number];

export const MEDICAL_CERTIFICATE_STATUS_LABELS: Record<
  MedicalCertificateStatus,
  string
> = {
  not_required: "Non requis",
  required_not_received: "Requis - non reçu",
  received: "Reçu",
  validated: "Validé",
};

export const MEDICAL_CERTIFICATE_REQUIRED_DECLARATIONS = [
  "over_40_first_or_changed_certificate_required",
  "questionnaire_yes_certificate_required",
] as const;

export function isMedicalCertificateRequired(
  declaration: string | null | undefined
): boolean {
  return MEDICAL_CERTIFICATE_REQUIRED_DECLARATIONS.includes(
    declaration as (typeof MEDICAL_CERTIFICATE_REQUIRED_DECLARATIONS)[number]
  );
}

export function isMedicalCertificateStatus(
  value: unknown
): value is MedicalCertificateStatus {
  return MEDICAL_CERTIFICATE_STATUS_VALUES.includes(
    value as MedicalCertificateStatus
  );
}

export function initialMedicalCertificateStatus(
  declaration: string | null | undefined
): MedicalCertificateStatus {
  return isMedicalCertificateRequired(declaration)
    ? "required_not_received"
    : "not_required";
}

export function normalizeMedicalCertificateStatus(
  status: unknown,
  declaration: string | null | undefined
): MedicalCertificateStatus {
  if (!isMedicalCertificateRequired(declaration)) {
    return "not_required";
  }
  return isMedicalCertificateStatus(status) && status !== "not_required"
    ? status
    : "required_not_received";
}

/** Filtre secrétariat sur le suivi certificat médical. */
export type ManagedListMedicalCertificateFilter = "all" | MedicalCertificateStatus;

export const MANAGED_LIST_MEDICAL_CERTIFICATE_FILTER_OPTIONS: {
  value: ManagedListMedicalCertificateFilter;
  label: string;
}[] = [
  { value: "all", label: "Tous certificats" },
  { value: "required_not_received", label: "Certificat attendu" },
  { value: "received", label: "Certificat reçu" },
  { value: "validated", label: "Certificat validé" },
];

export function resolveManagedListMedicalCertificateFilter(
  value: string | null | undefined
): ManagedListMedicalCertificateFilter {
  if (!value || value === "all") {
    return "all";
  }
  if (isMedicalCertificateStatus(value)) {
    return value;
  }
  return "all";
}

export function summaryMedicalCertificateStatus(
  summary: Record<string, unknown>
): MedicalCertificateStatus {
  const declaration =
    typeof summary.medicalCertificateDeclaration === "string"
      ? summary.medicalCertificateDeclaration
      : undefined;
  return normalizeMedicalCertificateStatus(summary.medicalCertificateStatus, declaration);
}

export function matchesMedicalCertificateFilter(
  summary: Record<string, unknown>,
  filter: ManagedListMedicalCertificateFilter
): boolean {
  if (filter === "all") {
    return true;
  }
  return summaryMedicalCertificateStatus(summary) === filter;
}
