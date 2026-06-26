/** Lien direct vers un dossier dans l’interface secrétariat / admin. */
export function buildRegistrationManagerDetailUrl(
  appOrigin: string,
  registrationId: string
): string {
  const base = appOrigin.replace(/\/$/, "");
  return `${base}/club/demandes-adhesion?id=${encodeURIComponent(registrationId)}`;
}
