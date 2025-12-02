import type { NextRequest } from "next/server";
import { initializeFirebaseAdmin, getFirestoreAdmin } from "@/lib/firebase-admin";
import { getTeams, TeamSummary } from "@/lib/server/team-matches";
import { requireAdminOrCoach } from "@/lib/api/auth-middleware";
import { createSecureResponse } from "@/lib/api/response-utils";
import { handleApiError, createErrorResponse } from "@/lib/api/error-handler";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminOrCoach(req, true); // requireEmailVerified = true
    if (auth instanceof Response) return auth;
    await initializeFirebaseAdmin();
    const firestore = getFirestoreAdmin();

    const teams: TeamSummary[] = await getTeams(firestore);

    console.log(`📊 [app/api/teams] ${teams.length} équipes récupérées depuis Firestore`);

    return createSecureResponse(
      {
        teams,
        total: teams.length,
      },
      200
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    if (
      errorMessage.includes("credentials") ||
      errorMessage.includes("Could not load the default credentials")
    ) {
      return createErrorResponse(
        "Firebase Admin credentials not configured",
        500,
        "Pour le développement local, configurez les credentials Firebase Admin. Voir README.md pour plus d'informations."
      );
    }

    return handleApiError(error, {
      context: "app/api/teams",
      defaultMessage: "Failed to fetch teams data",
    });
  }
}


