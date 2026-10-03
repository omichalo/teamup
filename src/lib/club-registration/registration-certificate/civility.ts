export type RegistrationSex = "female" | "male" | "other";

/**
 * Civilité pour l’attestation (modèle Excel « M., Mme » adapté au sexe saisi).
 * - male → M.
 * - female → Mme
 * - other / inconnu → M./Mme
 */
export function resolveCertificateCivility(sex: unknown): string {
  if (sex === "male") return "M.";
  if (sex === "female") return "Mme";
  return "M./Mme";
}

/** Accord du participe « inscrit(e) » selon le sexe. */
export function resolveCertificateEnrolledParticiple(sex: unknown): string {
  return sex === "female" ? "inscrite" : "inscrit";
}
