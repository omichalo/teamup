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

export const LICENSE_VALIDATION_WORKSPACE_DESCRIPTIONS: Record<
  LicenseValidationWorkspace,
  string
> = {
  licenses:
    "Parcourez les dossiers à traiter et renseignez le numéro de licence FFTT.",
  payments:
    "Recherchez un adhérent par nom ou licence pour enregistrer un chèque ou des chèques vacances.",
};
