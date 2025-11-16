import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { initializeFirebaseAdmin, getFirestoreAdmin } from "@/lib/firebase-admin";
import { getTeamMatches } from "@/lib/server/team-matches";

export async function GET(request: NextRequest) {
  // Avec Next 15 App Router, les params dynamiques sont exposés via searchParams dans .next/types/validator
  const url = new URL(request.url);
  const teamId = url.searchParams.get("teamId");

  if (!teamId || typeof teamId !== "string") {
    return NextResponse.json(
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


