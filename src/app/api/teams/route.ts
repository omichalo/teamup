import { jsonNoStore } from "@/lib/http/cache-headers";
import { adminDb } from "@/lib/firebase-admin";
import { getTeams, TeamSummary } from "@/lib/server/team-matches";
import { withAuth } from "@/lib/auth/api-utils";
import { USER_ROLES } from "@/lib/auth/roles";

export const runtime = "nodejs";

export const GET = withAuth(async () => {
  try {
    const teams: TeamSummary[] = await getTeams(adminDb);
    return jsonNoStore({ teams, total: teams.length });
  } catch (error) {
    console.error("[app/api/teams] GET error", error);
    return jsonNoStore(
      { error: "Erreur lors de la récupération des équipes" },
      { status: 500 }
    );
  }
}, [USER_ROLES.ADMIN, USER_ROLES.COACH]);
