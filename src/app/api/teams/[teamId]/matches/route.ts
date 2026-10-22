import { jsonNoStore } from "@/lib/http/cache-headers";
import { adminDb } from "@/lib/firebase-admin";
import { getTeamMatches } from "@/lib/server/team-matches";
import { withAuth } from "@/lib/auth/api-utils";
import { USER_ROLES } from "@/lib/auth/roles";

export const runtime = "nodejs";

export const GET = withAuth(async (_req, context) => {
  const { teamId } = (context as { params: Promise<{ teamId: string }> }).params
    ? await (context as { params: Promise<{ teamId: string }> }).params
    : { teamId: undefined };

  if (!teamId) {
    return jsonNoStore(
      { error: "L'identifiant de l'équipe est requis" },
      { status: 400 }
    );
  }

  try {
    const matches = await getTeamMatches(adminDb, teamId);

    return jsonNoStore({
      teamId,
      matches,
      total: matches.length,
    });
  } catch (error) {
    console.error(`[app/api/teams/${teamId}/matches] GET error`, error);
    return jsonNoStore(
      { error: "Erreur lors de la récupération des matchs de l'équipe" },
      { status: 500 }
    );
  }
}, [USER_ROLES.ADMIN, USER_ROLES.COACH]);
