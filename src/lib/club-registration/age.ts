/**
 * Helpers d'âge pour le formulaire d'inscription club.
 *
 * - `isAdultAt` : retourne true si la personne née à `birthDate` (format ISO YYYY-MM-DD)
 *   est majeure (>= 18 ans) à la date `at`. Anniversaire le jour J = majeur.
 * - `isMinorAt` : inverse de `isAdultAt`, false si `birthDate` est invalide ou vide.
 *
 * La référence `at` est paramétrable pour faciliter les tests et garantir la stabilité
 * (ne pas dépendre directement de `Date.now()`).
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseIsoDate(s: string): { y: number; m: number; d: number } | null {
  if (!ISO_DATE.test(s)) return null;
  const y = Number.parseInt(s.slice(0, 4), 10);
  const m = Number.parseInt(s.slice(5, 7), 10);
  const d = Number.parseInt(s.slice(8, 10), 10);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;
  return { y, m, d };
}

/** Renvoie true si `birthDate` (ISO) correspond à une personne majeure (>=18 ans) à la date `at`. */
export function isAdultAt(birthDate: string, at: Date = new Date()): boolean {
  const birth = parseIsoDate(birthDate);
  if (!birth) return false;

  const refY = at.getFullYear();
  const refM = at.getMonth() + 1;
  const refD = at.getDate();

  let years = refY - birth.y;
  if (refM < birth.m || (refM === birth.m && refD < birth.d)) {
    years -= 1;
  }
  return years >= 18;
}

/** Inverse pratique : false si `birthDate` est vide / invalide (pas de présomption de minorité). */
export function isMinorAt(birthDate: string, at: Date = new Date()): boolean {
  if (!birthDate) return false;
  const birth = parseIsoDate(birthDate);
  if (!birth) return false;
  return !isAdultAt(birthDate, at);
}
