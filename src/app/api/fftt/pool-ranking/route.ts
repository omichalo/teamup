import { jsonNoStore } from "@/lib/http/cache-headers";
import { withAuth } from "@/lib/auth/api-utils";
import { USER_ROLES } from "@/lib/auth/roles";
import {
  getFFTTConfig,
  createFFTTAPI,
  extractTeamNumber,
  determinePhaseFromDivision,
  isFemaleTeam,
} from "@/lib/shared/fftt-utils";

export const runtime = "nodejs";

async function createInitializedFFTTApi(retries = 1) {
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

export interface PoolRankingEntry {
  classement: number;
  nomEquipe: string;
  matchJouees: number;
  points: number;
  victoires: number;
  defaites: number;
  egalites: number;
  /** Points (ou sets) marqués par l'équipe */
  pf?: number;
  /** Points (ou sets) encaissés par l'équipe */
  pg?: number;
  /** Différence (pf - pg) */
  pp?: number;
}

type FFTTEquipeLike = {
  idEquipe: number;
  libelle: string;
  division: string;
  lienDivision: string;
  libelleEpreuve?: string;
  idEpreuve?: number;
  isFemale?: boolean;
};

/**
 * GET /api/fftt/pool-ranking?teamId=xxx&phase=aller|retour
 * Récupère le classement de la poule pour une équipe (données FFTT, pas stockées en base).
 * Si phase est fourni (aller|retour), utilise l'équipe FFTT dont la division correspond à cette phase.
 * Réservé aux coachs et admins.
 */
export const GET = withAuth(async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");
    if (!teamId || !teamId.trim()) {
      return jsonNoStore(
        { error: "Paramètre teamId requis" },
        { status: 400 }
      );
    }

    const phaseParam = searchParams.get("phase");
    const phase =
      phaseParam === "retour" || phaseParam === "aller" ? phaseParam : null;

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

    if (!equipe || !equipe.lienDivision) {
      return jsonNoStore(
        { error: "Équipe ou division non trouvée" },
        { status: 404 }
      );
    }

    // Si une phase est demandée et que l'équipe trouvée ne correspond pas à cette phase,
    // chercher l'équipe du même numéro (et même type M/F) dont la division correspond à la phase.
    if (phase) {
      const equipePhase = determinePhaseFromDivision(equipe.division);
      if (equipePhase !== phase) {
        const teamNumber = extractTeamNumber(equipe.libelle);
        const isFemale = (e: FFTTEquipeLike) =>
          e.isFemale !== undefined
            ? e.isFemale
            : isFemaleTeam(
                e.libelle,
                e.division,
                e.libelleEpreuve,
                e.idEpreuve
              );
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

    // L'API FFTT xml_result_equ attend D1 = id de la division (dans lienDivision).
    // La librairie ajoute params après lienDivision ; si on passe 1, ça écrase le D1
    // du lien et l'API reçoit "D1=1, action=classement" sans le reste → erreur.
    const d1Match = equipe.lienDivision.match(/D1=(\d+)/);
    const d1 = d1Match ? parseInt(d1Match[1], 10) : 1;

    const raw = await api.getClassementPouleByLienDivision(
      d1,
      "classement",
      null,
      equipe.lienDivision
    );

    if (!Array.isArray(raw)) {
      return jsonNoStore(
        { error: "Classement non disponible" },
        { status: 404 }
      );
    }

    // FFTT / lib : dans la réponse, pg = points marqués (Pour), pp = points encaissés (Contre).
    // On envoie donc Pour = pg, Contre = pp, Diff = pg - pp. Si pg/pp = victoires/défaites, on masque.
    const entries: PoolRankingEntry[] = (raw as Array<{
      classement: number;
      nomEquipe: string;
      matchJouees: number;
      points: number;
      victoires: number;
      defaites: number;
      egalites: number;
      pf?: number;
      pg?: number;
      pp?: number;
    }>).map((row) => {
      const apiPg = row.pg ?? 0;
      const apiPp = row.pp ?? 0;
      const isVictoiresDefaites =
        apiPg === row.victoires && apiPp === row.defaites;
      const out: PoolRankingEntry = {
        classement: row.classement,
        nomEquipe: row.nomEquipe,
        matchJouees: row.matchJouees,
        points: row.points,
        victoires: row.victoires,
        defaites: row.defaites,
        egalites: row.egalites,
      };
      if (!isVictoiresDefaites && (apiPg > 0 || apiPp > 0)) {
        out.pf = apiPg;
        out.pg = apiPp;
        out.pp = apiPg - apiPp;
      }
      return out;
    });

    return jsonNoStore(
      { ranking: entries, division: equipe.division },
      { status: 200 }
    );
  } catch (error) {
    console.error("[api/fftt/pool-ranking]", error);
    return jsonNoStore(
      { error: "Impossible de charger le classement pour le moment" },
      { status: 500 }
    );
  }
}, [USER_ROLES.ADMIN, USER_ROLES.COACH]);
