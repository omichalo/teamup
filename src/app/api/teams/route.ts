import { NextResponse } from "next/server";
import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { getTeams, TeamSummary } from "@/lib/server/team-matches";
import { USER_ROLES } from "@/lib/auth/roles";
import { verifyApiAuth } from "@/lib/auth/api-auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Vérification d'authentification et d'autorisation
    // L'accès à la liste des équipes est restreint aux administrateurs et coachs
    const { errorResponse } = await verifyApiAuth([USER_ROLES.ADMIN, USER_ROLES.COACH]);
    if (errorResponse) return errorResponse;

    const firestore = getFirestoreAdmin();

    const teams: TeamSummary[] = await getTeams(firestore);

    console.log(`📊 [app/api/teams] ${teams.length} équipes récupérées depuis Firestore`);

    return NextResponse.json(
      {
        teams,
        total: teams.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[app/api/teams] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "Failed to fetch teams data",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
