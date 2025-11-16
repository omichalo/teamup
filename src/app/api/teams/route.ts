import { NextResponse } from "next/server";
import { initializeFirebaseAdmin, getFirestoreAdmin } from "@/lib/firebase-admin";
import { getTeams, TeamSummary } from "@/lib/server/team-matches";

export async function GET() {
  try {
    await initializeFirebaseAdmin();
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
    console.error("[app/api/teams] Firestore Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    if (
      errorMessage.includes("credentials") ||
      errorMessage.includes("Could not load the default credentials")
    ) {
      return NextResponse.json(
        {
          error: "Firebase Admin credentials not configured",
          details:
            "Pour le développement local, configurez les credentials Firebase Admin. Voir README.md pour plus d'informations.",
          message: errorMessage,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to fetch teams data",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}


