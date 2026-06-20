import { jsonNoStore } from "@/lib/http/cache-headers";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";
import { hasAnyRole, USER_ROLES, resolveRole } from "@/lib/auth/roles";
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
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;
    if (!sessionCookie) {
      return jsonNoStore({ error: "Authentification requise" }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const role = resolveRole(decoded.role as string | undefined);

    if (!hasAnyRole(role, [USER_ROLES.ADMIN, USER_ROLES.COACH])) {
      return jsonNoStore({ error: "Accès refusé" }, { status: 403 });
    }

    const teamId = req.nextUrl.searchParams.get("teamId");
    if (!teamId?.trim()) {
      return jsonNoStore({ error: "Paramètre teamId requis" }, { status: 400 });
    }

    const phaseParam = req.nextUrl.searchParams.get("phase");
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
}
