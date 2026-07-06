/**
 * Helpers d'âge pour le formulaire d'inscription club.
 *
 * - `computeAgeAt` : âge en années révolues à la date `at`, ou `null` si la date est
 *   vide / invalide. Anniversaire le jour J = âge incrémenté.
 * - `isAdultAt` : true si la personne est majeure (>= 18 ans) à la date `at`.
 * - `isMinorAt` : inverse de `isAdultAt`. False si `birthDate` est vide ou invalide
 *   (pas de présomption de minorité).
 * - `isAtLeast40At` : true si la personne a 40 ans ou plus (legacy / rétrocompat).
 * - `isAtLeast65At` : true si la personne a 65 ans ou plus. Parcours vétéran FFTT.
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

/** Âge en années révolues à la date `at`, ou null si `birthDate` est vide/invalide. */
export function computeAgeAt(birthDate: string, at: Date = new Date()): number | null {
  const birth = parseIsoDate(birthDate);
  if (!birth) return null;

  const refY = at.getFullYear();
  const refM = at.getMonth() + 1;
  const refD = at.getDate();

  let years = refY - birth.y;
  if (refM < birth.m || (refM === birth.m && refD < birth.d)) {
    years -= 1;
  }
  return years;
}

/** Renvoie true si `birthDate` (ISO) correspond à une personne majeure (>=18 ans) à la date `at`. */
export function isAdultAt(birthDate: string, at: Date = new Date()): boolean {
  const years = computeAgeAt(birthDate, at);
  return years !== null && years >= 18;
}

/** Inverse pratique : false si `birthDate` est vide / invalide (pas de présomption de minorité). */
export function isMinorAt(birthDate: string, at: Date = new Date()): boolean {
  const years = computeAgeAt(birthDate, at);
  return years !== null && years < 18;
}

/** True si la personne a 40 ans ou plus (seuil historique, rétrocompat dossiers). */
export function isAtLeast40At(birthDate: string, at: Date = new Date()): boolean {
  const years = computeAgeAt(birthDate, at);
  return years !== null && years >= 40;
}

/** True si la personne a 65 ans ou plus (parcours vétéran / certificat FFTT). */
export function isAtLeast65At(birthDate: string, at: Date = new Date()): boolean {
  const years = computeAgeAt(birthDate, at);
  return years !== null && years >= 65;
}

/** Adulte majeur (≥ 18 ans) soumis au PPS ou au choix certificat (18–64 ans). */
export function isAdultPpsEligibleAt(birthDate: string, at: Date = new Date()): boolean {
  return isAdultAt(birthDate, at) && !isAtLeast65At(birthDate, at);
}
