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
