/**
 * Helpers pour getDetailsRencontreByLien : la FFTT fournit parfois
 * clubnum_1 / clubnum_2 inversés par rapport à equa / equb.
 * Dans ce cas, le matching club → joueurs échoue (licence vide, points null).
 */

type JoueurLike = {
  nom?: string;
  prenom?: string;
  licence?: string;
  points?: number | null;
};

function toJoueurList(arr: unknown): JoueurLike[] {
  if (Array.isArray(arr)) {
    return arr as JoueurLike[];
  }
  if (typeof arr === "object" && arr !== null) {
    return Object.values(arr) as JoueurLike[];
  }
  return [];
}

export function listRencontreJoueurs(details: {
  joueursA?: unknown;
  joueursB?: unknown;
}): JoueurLike[] {
  return [...toJoueurList(details.joueursA), ...toJoueurList(details.joueursB)];
}

/** Joueurs avec un nom utilisable (feuille de match renseignée). */
export function countNamedRencontrePlayers(details: {
  joueursA?: unknown;
  joueursB?: unknown;
}): number {
  return listRencontreJoueurs(details).filter((j) => {
    const nom = (j.nom ?? "").trim();
    const prenom = (j.prenom ?? "").trim();
    if (!nom && !prenom) return false;
    if (prenom.toLowerCase() === "absent" && !nom) return false;
    return true;
  }).length;
}

/** Joueurs avec des points numériques (matching club réussi). */
export function countRencontrePlayersWithPoints(details: {
  joueursA?: unknown;
  joueursB?: unknown;
}): number {
  return listRencontreJoueurs(details).filter(
    (j) => typeof j.points === "number" && Number.isFinite(j.points)
  ).length;
}

/**
 * Choisit entre le résultat « club1/club2 » et le résultat inversé.
 * Preferer celui qui a le plus de points résolus (signe d'un bon matching club).
 */
export function preferRencontreDetailsWithPoints<T extends {
  joueursA?: unknown;
  joueursB?: unknown;
}>(primary: T, swapped: T | null | undefined): T {
  if (!swapped) return primary;
  const namedPrimary = countNamedRencontrePlayers(primary);
  if (namedPrimary === 0) return primary;

  const pointsPrimary = countRencontrePlayersWithPoints(primary);
  const pointsSwapped = countRencontrePlayersWithPoints(swapped);
  return pointsSwapped > pointsPrimary ? swapped : primary;
}

type DetailsApi = {
  getDetailsRencontreByLien: (
    lien: string,
    clubEquipeA: string,
    clubEquipeB: string
  ) => Promise<unknown>;
};

/**
 * Appelle getDetailsRencontreByLien, et si des joueurs sont présents sans points,
 * réessaie avec clubnum_1 / clubnum_2 inversés (bizarrerie FFTT connue).
 */
export async function getDetailsRencontreWithClubFallback(
  api: DetailsApi,
  lien: string,
  club1: string,
  club2: string
): Promise<unknown> {
  const primary = await api.getDetailsRencontreByLien(lien, club1, club2);

  if (
    !primary ||
    typeof primary !== "object" ||
    !club1 ||
    !club2 ||
    club1 === club2
  ) {
    return primary;
  }

  const named = countNamedRencontrePlayers(
    primary as { joueursA?: unknown; joueursB?: unknown }
  );
  const withPoints = countRencontrePlayersWithPoints(
    primary as { joueursA?: unknown; joueursB?: unknown }
  );

  if (named === 0 || withPoints >= named) {
    return primary;
  }

  try {
    const swapped = await api.getDetailsRencontreByLien(lien, club2, club1);
    if (!swapped || typeof swapped !== "object") {
      return primary;
    }
    return preferRencontreDetailsWithPoints(
      primary as { joueursA?: unknown; joueursB?: unknown },
      swapped as { joueursA?: unknown; joueursB?: unknown }
    );
  } catch {
    return primary;
  }
}
