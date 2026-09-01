function titleCaseSegment(segment: string): string {
  const trimmed = segment.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

/** Normalise une ville pour regroupement et affichage (casse, espaces). */
export function normalizeCity(city: string | undefined): string {
  if (!city?.trim()) return "";
  return city
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .split(/(\s|-)/)
    .map((part) => {
      if (part === " " || part === "-") return part;
      return titleCaseSegment(part);
    })
    .join("");
}

/** Code postal normalisé (5 chiffres) ou chaîne vide. */
export function normalizePostalCode(postalCode: string | undefined): string {
  if (!postalCode?.trim()) return "";
  const digits = postalCode.trim().replace(/\s/g, "");
  return /^\d{5}$/.test(digits) ? digits : postalCode.trim();
}
