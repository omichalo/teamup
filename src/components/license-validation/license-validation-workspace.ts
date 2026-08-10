export type LicenseValidationWorkspace = "licenses" | "payments";

export const LICENSE_VALIDATION_WORKSPACES: readonly LicenseValidationWorkspace[] = [
  "licenses",
  "payments",
] as const;

export const LICENSE_VALIDATION_WORKSPACE_LABELS: Record<
  LicenseValidationWorkspace,
  string
> = {
  licenses: "Saisie des licences",
  payments: "Encaissements",
};
