import { jsonNoStore } from "@/lib/http/cache-headers";
import { withAuth } from "@/lib/auth/api-utils";
import { USER_ROLES } from "@/lib/auth/roles";
import {
  createInitializedFFTTApi,
  resolveEquipeByTeamId,
} from "@/lib/fftt/resolve-equipe-by-team-id";
import { buildUpcomingPoolSchedule } from "@/lib/shared/pool-schedule-utils";

export const runtime = "nodejs";

/**
 * GET /api/fftt/pool-schedule?teamId=xxx&phase=aller|retour
 * Calendrier de la poule : toutes les rencontres à venir (données FFTT live).
 * Réservé aux coachs et admins.
 */
export const GET = withAuth(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const teamId = url.searchParams.get("teamId");
    if (!teamId?.trim()) {
      return jsonNoStore({ error: "Paramètre teamId requis" }, { status: 400 });
    }

    const phaseParam = url.searchParams.get("phase");
    const phase =
      phaseParam === "retour" || phaseParam === "aller" ? phaseParam : null;

    const equipe = await resolveEquipeByTeamId(teamId.trim(), phase);
    if (!equipe?.lienDivision) {
      return jsonNoStore({ error: "Équipe ou division non trouvée" }, { status: 404 });
    }

    const api = await createInitializedFFTTApi();
    const rencontres = await api.getRencontrePouleByLienDivision(equipe.lienDivision);
    const schedule = buildUpcomingPoolSchedule(rencontres as unknown[]);

    return jsonNoStore(
      { schedule, division: equipe.division, teamName: equipe.libelle },
      { status: 200 }
    );
  } catch (error) {
    console.error("[api/fftt/pool-schedule]", error);
    return jsonNoStore(
      { error: "Impossible de charger le calendrier pour le moment" },
      { status: 500 }
    );
  }
}, [USER_ROLES.ADMIN, USER_ROLES.COACH]);
