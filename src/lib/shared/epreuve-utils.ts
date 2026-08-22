// Type pour les épreuves : "championnat_equipes" regroupe France masculin/féminin.
// "championnat_paris" correspond au championnat de Paris IDF (Excellence).
export type EpreuveType = "championnat_equipes" | "championnat_paris";

export type FfttEpreuveRef = {
  idEpreuve?: number | null | undefined;
  libelleEpreuve?: string | null | undefined;
  epreuve?: string | null | undefined;
};

// IDs FFTT connus (saisons passées + courante). Ils changent chaque année :
// le libellé reste la source de vérité pour la synchro.
export const ID_EPREUVE_MASCULIN = 15954;
export const ID_EPREUVE_FEMININ = 15955;
export const ID_EPREUVE_PARIS = 15980;

const KNOWN_FRANCE_TEAM_EPREUVE_IDS: ReadonlySet<number> = new Set([
  ID_EPREUVE_MASCULIN,
  ID_EPREUVE_FEMININ,
  18368, // 2026-2027 masculin
  18369, // 2026-2027 féminin
]);

const KNOWN_PARIS_EPREUVE_IDS: ReadonlySet<number> = new Set([ID_EPREUVE_PARIS]);

function normalizeEpreuveLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/[éèêë]/g, "e")
    .replace(/[àâ]/g, "a")
    .replace(/[îï]/g, "i")
    .replace(/[ôö]/g, "o")
    .replace(/[ùûü]/g, "u")
    .replace(/ç/g, "c")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function epreuveLabelOf(params: FfttEpreuveRef): string {
  return normalizeEpreuveLabel(params.libelleEpreuve ?? params.epreuve ?? "");
}

function classifyFromLabel(label: string): EpreuveType | null {
  if (!label) return null;
  if (label.includes("paris idf") || (label.includes("excellence") && label.includes("paris"))) {
    return "championnat_paris";
  }
  if (label.includes("excellence") && !label.includes("championnat de france")) {
    return "championnat_paris";
  }
  const isFranceTeams =
    label.includes("championnat de france") &&
    (label.includes("equipe") || label.includes("equipes") || label.includes("par equipe"));
  if (isFranceTeams) {
    return "championnat_equipes";
  }
  return null;
}

export function classifyClubChampionshipEpreuve(
  params: FfttEpreuveRef
): EpreuveType | null {
  const idEpreuve = params.idEpreuve ?? null;
  if (idEpreuve != null && KNOWN_FRANCE_TEAM_EPREUVE_IDS.has(idEpreuve)) {
    return "championnat_equipes";
  }
  if (idEpreuve != null && KNOWN_PARIS_EPREUVE_IDS.has(idEpreuve)) {
    return "championnat_paris";
  }
  return classifyFromLabel(epreuveLabelOf(params));
}

export function isTrackedClubChampionshipEpreuve(params: FfttEpreuveRef): boolean {
  return classifyClubChampionshipEpreuve(params) != null;
}

export type ChampionshipGender = "masculin" | "feminin";

export function resolveIdEpreuveFromEquipes(
  equipes: ReadonlyArray<{
    team: {
      idEpreuve?: number | undefined;
      epreuve?: string | undefined;
      isFemale?: boolean | undefined;
    };
    matches?: ReadonlyArray<{ isFemale?: boolean | undefined }>;
  }>,
  championshipType: ChampionshipGender,
  epreuveType?: EpreuveType | null
): number | undefined {
  const wantParis = epreuveType === "championnat_paris";
  const wantFemale = championshipType === "feminin";

  for (const equipe of equipes) {
    const classified = classifyClubChampionshipEpreuve({
      idEpreuve: equipe.team.idEpreuve,
      epreuve: equipe.team.epreuve,
    });
    if (wantParis) {
      if (classified === "championnat_paris" && equipe.team.idEpreuve != null) {
        return equipe.team.idEpreuve;
      }
      continue;
    }
    if (classified === "championnat_paris") {
      continue;
    }
    const isFemale =
      equipe.team.isFemale === true ||
      equipe.matches?.some((match) => match.isFemale === true) === true;
    if (isFemale !== wantFemale) {
      continue;
    }
    if (equipe.team.idEpreuve != null) {
      return equipe.team.idEpreuve;
    }
  }

  if (wantParis) {
    return ID_EPREUVE_PARIS;
  }
  return undefined;
}

/**
 * Calcule l'idEpreuve à partir de selectedEpreuve
 * @param epreuve - Type d'épreuve sélectionné
 * @returns ID de l'épreuve FFTT ou undefined pour la rétrocompatibilité
 */
export function getIdEpreuve(epreuve: EpreuveType | null): number | undefined {
  if (epreuve === "championnat_equipes") {
    // Pour le championnat par équipes, on utilise undefined pour la rétrocompatibilité
    // (les anciennes disponibilités sans idEpreuve sont pour le championnat par équipes)
    return undefined;
  }
  if (epreuve === "championnat_paris") {
    return ID_EPREUVE_PARIS;
  }
  return undefined;
}

/**
 * Détermine l'épreuve d'un match ou d'une équipe
 * @param match - Match avec idEpreuve optionnel
 * @param equipe - Équipe avec idEpreuve et epreuve optionnels
 * @returns Type d'épreuve ou null si non déterminable
 */
export function getMatchEpreuve(
  match: { idEpreuve?: number },
  equipe?: { idEpreuve?: number; epreuve?: string; libelleEpreuve?: string }
): EpreuveType | null {
  return classifyClubChampionshipEpreuve({
    idEpreuve: match.idEpreuve ?? equipe?.idEpreuve,
    epreuve: equipe?.epreuve,
    libelleEpreuve: equipe?.libelleEpreuve,
  });
}

/**
 * Indique si l'épreuve correspond au championnat de Paris (une seule phase).
 * Accepte le type EpreuveType (dispo/compos) ou un libellé d'épreuve (page équipes).
 */
export function isParisEpreuve(epreuve: EpreuveType | string | null | undefined): boolean {
  if (epreuve == null) return false;
  if (epreuve === "championnat_paris") return true;
  if (typeof epreuve === "string") {
    return classifyFromLabel(normalizeEpreuveLabel(epreuve)) === "championnat_paris";
  }
  return false;
}
