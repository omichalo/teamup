import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { getTeamMatches } from "@/lib/server/team-matches";
import { verifyApiAuth } from "@/lib/auth/api-auth";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    // Vérification d'authentification
    const { errorResponse } = await verifyApiAuth();
    if (errorResponse) return errorResponse;

    // Récupérer teamId depuis les paramètres de route
    const { teamId } = await params;

    if (!teamId || typeof teamId !== "string") {
      return NextResponse.json(
        { error: "Team ID parameter is required" },
        { status: 400 }
      );
    }

    const firestore = getFirestoreAdmin();
    const matches = await getTeamMatches(firestore, teamId);

    console.log(
      `📊 [app/api/teams/${teamId}/matches] ${matches.length} matchs récupérés pour l'équipe ${teamId}`
    );

    return NextResponse.json(
      {
        teamId,
        matches,
        total: matches.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[app/api/teams/[teamId]/matches] Firestore Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch team matches",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
