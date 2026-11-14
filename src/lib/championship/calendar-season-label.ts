/**
 * Libellé de saison calendaire club / championnat : 1er septembre → 31 août.
 * Ex. le 14 nov. 2026 → "2026-2027" ; le 31 août 2026 → "2025-2026".
 */
export function seasonLabelFromDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0 = janvier
  const startYear = month >= 8 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

const SEASON_LABEL_RE = /^(\d{4})-(\d{4})$/;

export function isSeasonLabel(value: string): boolean {
  const match = SEASON_LABEL_RE.exec(value.trim());
  if (!match) {
    return false;
  }
  const start = Number.parseInt(match[1], 10);
  const end = Number.parseInt(match[2], 10);
  return Number.isFinite(start) && Number.isFinite(end) && end === start + 1;
}

/** Borne inclusive de début de saison (UTC midi pour éviter les décalages TZ). */
export function seasonStartDate(seasonLabel: string): Date {
  const match = SEASON_LABEL_RE.exec(seasonLabel.trim());
  if (!match) {
    throw new Error(`Libellé de saison invalide: ${seasonLabel}`);
  }
  const startYear = Number.parseInt(match[1], 10);
  return new Date(Date.UTC(startYear, 8, 1, 12, 0, 0));
}
