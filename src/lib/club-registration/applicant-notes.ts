/** Longueur maximale des précisions libres saisies par l'inscrit en fin de parcours. */
export const APPLICANT_NOTES_MAX_LENGTH = 2000;

/** Retourne le texte normalisé ou `undefined` si vide (omission en base). */
export function normalizeApplicantNotes(value: string | undefined): string | undefined {
  const trimmed = value?.trim() ?? "";
  if (trimmed === "") return undefined;
  return trimmed;
}

export function isApplicantNotesTooLong(value: string): boolean {
  return value.length > APPLICANT_NOTES_MAX_LENGTH;
}
