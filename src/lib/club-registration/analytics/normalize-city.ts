function titleCaseSegment(segment: string): string {
  const trimmed = segment.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

function titleCaseWithApostrophe(segment: string): string {
  return segment
    .split("'")
    .map((part) => titleCaseSegment(part))
    .join("'");
}

/**
 * Normalise une ville pour regroupement et affichage.
 * Unifie casse, accents de séparateurs (espace / tiret) et apostrophes afin que
 * « Voisins Le Bretonneux » et « Voisins-Le-Bretonneux » comptent comme une seule entrée.
 */
export function normalizeCity(city: string | undefined): string {
  if (!city?.trim()) return "";
  return city
    .trim()
    .normalize("NFC")
    .toLowerCase()
    .replace(/[''`´]/g, "'")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .filter(Boolean)
    .map(titleCaseWithApostrophe)
    .join("-");
}

/** Code postal normalisé (5 chiffres) ou chaîne vide. */
export function normalizePostalCode(postalCode: string | undefined): string {
  if (!postalCode?.trim()) return "";
  const digits = postalCode.trim().replace(/\s/g, "");
  return /^\d{5}$/.test(digits) ? digits : postalCode.trim();
}
