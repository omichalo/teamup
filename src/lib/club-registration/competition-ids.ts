/**
 * Identifiants compétitions — alignés sur https://www.sqyping.fr/tarifs
 * (section « Les compétitions »).
 */

/** Id canonique pour la facturation (forfait unique 25 €). */
export const COMPETITIONS_JEUNES_ID = "competitions_jeunes" as const;

/** Ids sélectionnables indépendamment dans le formulaire. */
export const YOUTH_COMPETITION_FORM_IDS = [
  "championnat_jeunes",
  "criterium_federal_jeunes",
] as const;

/** @deprecated Utiliser `YOUTH_COMPETITION_FORM_IDS`. */
export const LEGACY_COMPETITIONS_JEUNES_IDS = YOUTH_COMPETITION_FORM_IDS;

export type YouthCompetitionFormId =
  (typeof YOUTH_COMPETITION_FORM_IDS)[number];

export type LegacyCompetitionsJeunesId = YouthCompetitionFormId;

export function isYouthCompetitionId(id: string): boolean {
  return (
    id === COMPETITIONS_JEUNES_ID ||
    (LEGACY_COMPETITIONS_JEUNES_IDS as readonly string[]).includes(id)
  );
}

/**
 * Déplie l’id de facturation historique vers les deux options formulaire
 * (dossiers créés avant la séparation des compétitions jeunes).
 */
/**
 * @deprecated Préférer `expandCompetitionIdsForFormFromConfig(config, ids)`.
 */
export function expandCompetitionIdsForForm(ids: string[]): string[] {
  const expanded: string[] = [];

  for (const id of ids) {
    if (id === COMPETITIONS_JEUNES_ID) {
      for (const youthId of YOUTH_COMPETITION_FORM_IDS) {
        if (!expanded.includes(youthId)) {
          expanded.push(youthId);
        }
      }
      continue;
    }
    if (!expanded.includes(id)) {
      expanded.push(id);
    }
  }

  return expanded;
}

/**
 * Une seule ligne « Compétitions jeunes » à 25 € pour la facturation,
 * même si une ou les deux compétitions jeunes sont cochées.
 */
/**
 * @deprecated Préférer `normalizeCompetitionIdsFromConfig(config, ids)`.
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
