/** Normalise un nom de famille (trim + majuscules, convention FFTT / joueurs). */
export function normalizeLastName(value: string): string {
  return value.trim().toLocaleUpperCase("fr-FR");
}

/** Casse à appliquer pendant la saisie (sans trim pour ne pas perturber la frappe). */
export function normalizeLastNameOnInput(value: string): string {
  return value.toLocaleUpperCase("fr-FR");
}

/** Affichage d'un nom de famille (données legacy ou externes incluses). */
export function formatLastNameForDisplay(value: string | null | undefined): string {
  if (value == null || value === "") return "";
  return normalizeLastName(value);
}

/** Affiche « Prénom NOM » avec la casse conventionnelle. */
export function formatPersonDisplayName(
  firstName: string | null | undefined,
  lastName: string | null | undefined
): string {
  const first = (firstName ?? "").trim();
  const last = formatLastNameForDisplay(lastName);
  return [first, last].filter(Boolean).join(" ");
}

/** Normalise les champs nom d'un patch dossier d'adhésion (adhérent + représentants). */
export function normalizeRegistrationLastNamePatch(
  updates: Record<string, unknown>
): Record<string, unknown> {
  const next = { ...updates };

  if (typeof next.lastName === "string") {
    next.lastName = normalizeLastName(next.lastName);
  }

  if (Array.isArray(next.representatives)) {
    next.representatives = next.representatives.map((entry) => {
      if (!entry || typeof entry !== "object") return entry;
      const rep = entry as Record<string, unknown>;
      if (typeof rep.lastName !== "string") return entry;
      return { ...rep, lastName: normalizeLastName(rep.lastName) };
    });
  }

  if (next.ffttLicenseLookup && typeof next.ffttLicenseLookup === "object") {
    const lookup = next.ffttLicenseLookup as Record<string, unknown>;
    if (typeof lookup.nom === "string" && lookup.nom.trim().length > 0) {
      next.ffttLicenseLookup = {
        ...lookup,
        nom: normalizeLastName(lookup.nom),
      };
    }
  }

  return next;
}
