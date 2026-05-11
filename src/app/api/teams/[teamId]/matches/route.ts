import { jsonNoStore } from "@/lib/http/cache-headers";
import { initializeFirebaseAdmin, getFirestoreAdmin } from "@/lib/firebase-admin";
import { getTeamMatches } from "@/lib/server/team-matches";
import { withAuth } from "@/lib/auth/api-utils";
import { USER_ROLES } from "@/lib/auth/roles";

export const runtime = "nodejs";

export const GET = withAuth(async (
  _request: Request,
  context: any
) => {
  // Récupérer teamId depuis les paramètres de route
  const { teamId } = await (context.params as Promise<{ teamId: string }>);

  if (!teamId || typeof teamId !== "string") {
    return jsonNoStore(
      { error: "Team ID parameter is required" },
      { status: 400 }
    );
  }

  try {
    await initializeFirebaseAdmin();
    const firestore = getFirestoreAdmin();
    const matches = await getTeamMatches(firestore, teamId);

    console.log(
      `📊 [app/api/teams/${teamId}/matches] ${matches.length} matchs récupérés pour l'équipe ${teamId}`
    );

    return jsonNoStore(
      {
        teamId,
        matches,
        total: matches.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[app/api/teams/[teamId]/matches] Firestore Error:", error);
    return jsonNoStore(
      {
        error: "Failed to fetch team matches",
      },
      { status: 500 }
    );
  }
}, [USER_ROLES.ADMIN, USER_ROLES.COACH]);
