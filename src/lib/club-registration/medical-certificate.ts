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
  "minor_yes_certificate_required",
  "adult_certificate_required",
  "senior_certificate_required",
  // Rétrocompatibilité dossiers antérieurs
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
  hint?: string;
}[] = [
  { value: "all", label: "Tous" },
  {
    value: "required_not_received",
    label: "Attendu",
    hint: "Certificat requis, pas encore reçu au bureau.",
  },
  {
    value: "received",
    label: "Reçu",
    hint: "Document reçu, en attente de contrôle par le secrétariat.",
  },
  {
    value: "validated",
    label: "Contrôlé",
    hint: "Certificat reçu et vérifié conforme par le secrétariat.",
  },
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

/**
 * Synthèse secrétariat du parcours médical (nouvelles règles + rétrocompat).
 * Les déclarations ancien régime sans certificat (`under_40_all_no`,
 * `over_40_cert_unchanged_all_no`) sont traitées comme un PPS attendu.
 */
export type MedicalFollowUpKind =
  | "ok"
  | "pps_expected"
  | "certificate_expected"
  | "certificate_received";

export const MEDICAL_FOLLOW_UP_LABELS: Record<MedicalFollowUpKind, string> = {
  ok: "OK",
  pps_expected: "PPS attendu",
  certificate_expected: "Certificat médical attendu",
  certificate_received: "Certificat médical reçu",
};

const PPS_EQUIVALENT_DECLARATIONS: ReadonlySet<string> = new Set([
  "adult_pps_declared",
  "under_40_all_no",
  "over_40_cert_unchanged_all_no",
]);

const OK_WITHOUT_FOLLOW_UP_DECLARATIONS: ReadonlySet<string> = new Set([
  "minor_all_no",
]);

function resolveCertificateFollowUpKind(
  status: string | null | undefined
): MedicalFollowUpKind {
  if (status === "validated") {
    return "ok";
  }
  if (status === "received") {
    return "certificate_received";
  }
  return "certificate_expected";
}

export function resolveMedicalFollowUpKind(
  declaration: string | null | undefined,
  status: string | null | undefined
): MedicalFollowUpKind | null {
  if (!declaration && !status) {
    return null;
  }

  if (declaration && PPS_EQUIVALENT_DECLARATIONS.has(declaration)) {
    return "pps_expected";
  }

  if (declaration && OK_WITHOUT_FOLLOW_UP_DECLARATIONS.has(declaration)) {
    return "ok";
  }

  if (declaration && isMedicalCertificateRequired(declaration)) {
    return resolveCertificateFollowUpKind(status);
  }

  if (status === "validated" || status === "not_required") {
    return "ok";
  }
  if (status === "received") {
    return "certificate_received";
  }
  if (status === "required_not_received") {
    return "certificate_expected";
  }

  return null;
}

export function formatMedicalFollowUpLabel(
  declaration: string | null | undefined,
  status: string | null | undefined
): string {
  const kind = resolveMedicalFollowUpKind(declaration, status);
  return kind ? MEDICAL_FOLLOW_UP_LABELS[kind] : "—";
}
