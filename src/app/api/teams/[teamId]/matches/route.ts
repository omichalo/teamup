import { jsonNoStore } from "@/lib/http/cache-headers";
import { initializeFirebaseAdmin, getFirestoreAdmin } from "@/lib/firebase-admin";
import { getTeamMatches } from "@/lib/server/team-matches";
import { withAuth } from "@/lib/auth/api-utils";
import { USER_ROLES } from "@/lib/auth/roles";

export const runtime = "nodejs";

/**
 * GET /api/teams/[teamId]/matches
 * Récupère les matchs d'une équipe spécifique.
 * Accès réservé aux administrateurs et coachs.
 */
export const GET = withAuth(async (_req: Request, context: unknown) => {
  try {
    const { params } = context as { params: Promise<{ teamId: string }> };
    const { teamId } = await params;

    if (!teamId || typeof teamId !== "string") {
      return jsonNoStore(
        { error: "Team ID parameter is required" },
        { status: 400 }
      );
    }

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
    console.error("[app/api/teams/[teamId]/matches] Error:", error);
    // On ne renvoie pas les détails de l'erreur au client pour des raisons de sécurité
    return jsonNoStore(
      {
        error: "Failed to fetch team matches",
      },
      { status: 500 }
    );
  }
}, [USER_ROLES.ADMIN, USER_ROLES.COACH]);
