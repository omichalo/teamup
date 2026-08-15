export const LICENSE_VALIDATION_STATUS_VALUES = [
  "to_do",
  "done",
  "validated_without_sport",
  "other_federation",
] as const;

export type LicenseValidationStatus =
  (typeof LICENSE_VALIDATION_STATUS_VALUES)[number];

export const LICENSE_VALIDATION_STATUS_LABELS: Record<
  LicenseValidationStatus,
  string
> = {
  to_do: "À faire",
  done: "Traité",
  validated_without_sport: "Validé sans pratique sportive",
  other_federation: "Autre fédération",
};

export const DEFAULT_LICENSE_VALIDATION_STATUS: LicenseValidationStatus = "to_do";

export function isLicenseValidationStatus(
  value: unknown
): value is LicenseValidationStatus {
  return LICENSE_VALIDATION_STATUS_VALUES.includes(
    value as LicenseValidationStatus
  );
}

export function normalizeLicenseValidationStatus(
  value: unknown
): LicenseValidationStatus {
  return isLicenseValidationStatus(value)
    ? value
    : DEFAULT_LICENSE_VALIDATION_STATUS;
}

export type LicenseValidationListFilter = LicenseValidationStatus | "all";

export function resolveLicenseValidationListFilter(
  raw: string | null | undefined
): LicenseValidationListFilter {
  if (!raw || raw === "all") {
    return "all";
  }
  return isLicenseValidationStatus(raw) ? raw : "all";
}

export function matchesLicenseStatusFilter(
  item: { licenseValidationStatus: LicenseValidationStatus },
  statusFilter: LicenseValidationListFilter
): boolean {
  if (statusFilter === "all") {
    return true;
  }
  return item.licenseValidationStatus === statusFilter;
}
