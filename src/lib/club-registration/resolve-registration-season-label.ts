import type { DocumentData } from "firebase-admin/firestore";

/** Lit `seasonLabel` sur un dossier, ou `undefined` si absent / vide. */
export function readRegistrationSeasonLabel(data: DocumentData): string | undefined {
  const value = data.seasonLabel;
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return undefined;
}

/**
 * Saison effective d'un dossier : valeur persistée, ou saison active si manquante
 * (première saison du système — dossiers créés avant l'introduction du champ).
 */
export function resolveRegistrationSeasonLabel(
  data: DocumentData,
  activeSeasonLabel: string
): string {
  return readRegistrationSeasonLabel(data) ?? activeSeasonLabel.trim();
}

export function registrationMissingSeasonLabel(data: DocumentData): boolean {
  return readRegistrationSeasonLabel(data) === undefined;
}

export function registrationMatchesActiveSeason(
  data: DocumentData,
  activeSeasonLabel: string
): boolean {
  return resolveRegistrationSeasonLabel(data, activeSeasonLabel) === activeSeasonLabel.trim();
}
