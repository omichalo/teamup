/**
 * Identifiants compétitions — alignés sur https://www.sqyping.fr/tarifs
 * (section « Les compétitions »).
 */

/** Id canonique (grille publique). */
export const COMPETITIONS_JEUNES_ID = "competitions_jeunes" as const;

/** Anciennes valeurs formulaire papier / Webflow (rétrocompatibilité dossiers). */
export const LEGACY_COMPETITIONS_JEUNES_IDS = [
  "championnat_jeunes",
  "criterium_federal_jeunes",
] as const;

export type LegacyCompetitionsJeunesId =
  (typeof LEGACY_COMPETITIONS_JEUNES_IDS)[number];

export function isYouthCompetitionId(id: string): boolean {
  return (
    id === COMPETITIONS_JEUNES_ID ||
    (LEGACY_COMPETITIONS_JEUNES_IDS as readonly string[]).includes(id)
  );
}

/**
 * Une seule entrée « Compétitions jeunes » à 25 € même si plusieurs ids jeunes
 * coexistent dans un dossier historique.
 */
export function normalizeCompetitionIds(ids: string[]): string[] {
  const normalized: string[] = [];
  let youthAdded = false;

  for (const id of ids) {
    if (isYouthCompetitionId(id)) {
      if (!youthAdded) {
        normalized.push(COMPETITIONS_JEUNES_ID);
        youthAdded = true;
      }
      continue;
    }
    if (!normalized.includes(id)) {
      normalized.push(id);
    }
  }

  return normalized;
}
