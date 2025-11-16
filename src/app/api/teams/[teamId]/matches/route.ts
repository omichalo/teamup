import { NextResponse } from "next/server";
import { initializeFirebaseAdmin, getFirestoreAdmin } from "@/lib/firebase-admin";
import { getTeamMatches } from "@/lib/server/team-matches";

interface RouteParams {
  params: {
    teamId: string;
  };
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { teamId } = params;

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


