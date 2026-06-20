import {
  createFFTTAPI,
  determinePhaseFromDivision,
  extractTeamNumber,
  getFFTTConfig,
  isFemaleTeam,
} from "@/lib/shared/fftt-utils";

export type FFTTEquipeLike = {
  idEquipe: number;
  libelle: string;
  division: string;
  lienDivision: string;
  libelleEpreuve?: string;
  idEpreuve?: number;
  isFemale?: boolean;
};

export async function createInitializedFFTTApi(retries = 1) {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const api = createFFTTAPI();
    try {
      await api.initialize();
      return api;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

/**
 * Résout une équipe FFTT à partir de l'identifiant stocké (teamId) et d'une phase optionnelle.
 */
export async function resolveEquipeByTeamId(
  teamId: string,
  phase: "aller" | "retour" | null
): Promise<FFTTEquipeLike | null> {
  const { clubCode } = getFFTTConfig();
  const api = await createInitializedFFTTApi();
  const equipes = (await api.getEquipesByClub(clubCode)) as FFTTEquipeLike[];

  const teamIdTrim = teamId.trim();
  const phaseFromId = teamIdTrim.endsWith("_aller")
    ? "aller"
    : teamIdTrim.endsWith("_retour")
      ? "retour"
      : null;
  const idEquipeStr = phaseFromId
    ? teamIdTrim.replace(/_(aller|retour)$/, "")
    : teamIdTrim;

  let equipe = equipes.find((e: FFTTEquipeLike) => {
    if (e.idEquipe.toString() !== idEquipeStr) return false;
    if (phaseFromId) {
      return determinePhaseFromDivision(e.division) === phaseFromId;
    }
    return true;
  });

  if (!equipe?.lienDivision) {
    return null;
  }

  if (phase) {
    const equipePhase = determinePhaseFromDivision(equipe.division);
    if (equipePhase !== phase) {
      const teamNumber = extractTeamNumber(equipe.libelle);
      const isFemale = (e: FFTTEquipeLike) =>
        e.isFemale !== undefined
          ? e.isFemale
          : isFemaleTeam(e.libelle, e.division, e.libelleEpreuve, e.idEpreuve);
      const equipeIsFemale = isFemale(equipe);
      const samePhaseEquipe = equipes.find((e: FFTTEquipeLike) => {
        if (!e.lienDivision) return false;
        if (extractTeamNumber(e.libelle) !== teamNumber) return false;
        if (isFemale(e) !== equipeIsFemale) return false;
        return determinePhaseFromDivision(e.division) === phase;
      });
      if (samePhaseEquipe) {
        equipe = samePhaseEquipe;
      }
    }
  }

  return equipe;
}
