import type { NextRequest } from "next/server";
import { initializeFirebaseAdmin, getFirestoreAdmin } from "@/lib/firebase-admin";
import { getTeamMatches } from "@/lib/server/team-matches";
import { requireAuth } from "@/lib/api/auth-middleware";
import { createSecureResponse } from "@/lib/api/response-utils";
import { handleApiError } from "@/lib/api/error-handler";
import { validateId } from "@/lib/api/validation-helpers";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const auth = await requireAuth(req, { requireEmailVerified: true });
    if (auth instanceof Response) return auth;

    // Récupérer teamId depuis les paramètres de route
    const { teamId } = await params;

    const idError = validateId(teamId, "teamId");
    if (idError) return idError;

    await initializeFirebaseAdmin();
    const firestore = getFirestoreAdmin();
    const matches = await getTeamMatches(firestore, teamId);

    console.log(
      `📊 [app/api/teams/${teamId}/matches] ${matches.length} matchs récupérés pour l'équipe ${teamId}`
    );

    return createSecureResponse(
      {
        teamId,
        matches,
        total: matches.length,
      },
      200
    );
  } catch (error) {
    return handleApiError(error, {
      context: "app/api/teams/[teamId]/matches",
      defaultMessage: "Failed to fetch team matches",
    });
  }
}


