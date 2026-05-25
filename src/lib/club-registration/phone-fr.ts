/**
 * Contrôle de surface pour numéros de téléphone français :
 * - national : 10 chiffres, commence par 0 puis 1–9 (fixe 01–05 / 09, mobile 06–07, etc.)
 * - international : +33 ou 0033 suivi de 9 chiffres sans le 0 initial
 */

const FR_NATIONAL = /^0[1-9]\d{8}$/;
const FR_INTL_REST = /^[1-9]\d{8}$/;

export function normalizeFrenchPhoneInput(raw: string): string | null {
  const trimmed = raw.trim().replace(/[\s.\-\u00A0]/g, "");
  if (trimmed === "") return null;
  if (trimmed.startsWith("+33")) {
    const rest = trimmed.slice(3);
    return FR_INTL_REST.test(rest) ? `0${rest}` : null;
  }
  if (trimmed.startsWith("0033")) {
    const rest = trimmed.slice(4);
    return FR_INTL_REST.test(rest) ? `0${rest}` : null;
  }
  if (FR_NATIONAL.test(trimmed)) return trimmed;
  return null;
}

export function isValidFrenchPhoneSurface(raw: string): boolean {
  return normalizeFrenchPhoneInput(raw) !== null;
}

/** Masque d’affichage / saisie : groupes de 2 chiffres (ex. 06 34 44 55 33). */
export function formatFrenchPhoneMask(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 10);
  if (d.length === 0) return "";
  const parts: string[] = [];
  for (let i = 0; i < d.length; i += 2) {
    parts.push(d.slice(i, i + 2));
  }
  return parts.join(" ");
}

/**
 * Interprète la saisie ou un collage : renvoie uniquement les chiffres nationaux (max 10).
 * Reconnait +33 / 0033 ; sinon ne garde que les chiffres.
 */
export function extractNationalDigitsForMask(raw: string | undefined): string {
  const t = (raw ?? "").trim();
  if (t === "") return "";
  if (t.startsWith("+") || t.startsWith("00")) {
    const n = normalizeFrenchPhoneInput(t);
    return n ?? "";
  }
  return t.replace(/\D/g, "").slice(0, 10);
}

/** Valeur stockée → affichage masqué (rechargement API, valeurs sans espaces). */
export function toFrenchPhoneMaskedDisplay(stored: string | undefined): string {
  return formatFrenchPhoneMask(extractNationalDigitsForMask(stored));
}
