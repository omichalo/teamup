/** URL Mes dossiers, avec focus optionnel sur un dossier (lien e-mail de paiement). */
export function buildMesInscriptionsUrl(
  appOrigin: string,
  registrationId?: string
): string {
  const base = `${appOrigin.replace(/\/$/, "")}/club/mes-inscriptions`;
  if (!registrationId) {
    return base;
  }
  return `${base}?registration=${encodeURIComponent(registrationId)}`;
}
