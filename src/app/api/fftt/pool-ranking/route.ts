import { jsonNoStore } from "@/lib/http/cache-headers";
import { withAuth } from "@/lib/auth/api-utils";
import { USER_ROLES } from "@/lib/auth/roles";
import {
  createInitializedFFTTApi,
  resolveEquipeByTeamId,
} from "@/lib/fftt/resolve-equipe-by-team-id";

export const runtime = "nodejs";

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

/**
 * GET /api/fftt/pool-ranking?teamId=xxx&phase=aller|retour
 * Récupère le classement de la poule pour une équipe (données FFTT, pas stockées en base).
 * Si phase est fourni (aller|retour), utilise l'équipe FFTT dont la division correspond à cette phase.
 * Réservé aux coachs et admins.
 */
export const GET = withAuth(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const teamId = url.searchParams.get("teamId");
    if (!teamId || !teamId.trim()) {
      return jsonNoStore(
        { error: "Paramètre teamId requis" },
        { status: 400 }
      );
    }

    const phaseParam = url.searchParams.get("phase");
    const phase =
      phaseParam === "retour" || phaseParam === "aller" ? phaseParam : null;

    const equipe = await resolveEquipeByTeamId(teamId.trim(), phase);
    if (!equipe?.lienDivision) {
      return jsonNoStore(
        { error: "Équipe ou division non trouvée" },
        { status: 404 }
      );
    }

    const d1Match = equipe.lienDivision.match(/D1=(\d+)/);
    const d1 = d1Match ? parseInt(d1Match[1], 10) : 1;

    const api = await createInitializedFFTTApi();
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
