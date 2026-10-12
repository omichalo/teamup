/**
 * Saison sportive club (sept. → août) dérivée d’une date YYYY-MM-DD.
 * Ex. 2026-10-19 → "2026-2027" ; 2027-02-01 → "2026-2027".
 */
export function seasonLabelFromYmd(ymd: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!match) {
    const year = new Date().getFullYear();
    return `${year}-${year + 1}`;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month >= 9) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}
