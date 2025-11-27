import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { initializeFirebaseAdmin, getFirestoreAdmin, adminAuth } from "@/lib/firebase-admin";
import { getTeamMatches } from "@/lib/server/team-matches";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  // Vérification d'authentification
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value;
  
  if (!sessionCookie) {
    return NextResponse.json(
      { error: "Authentification requise" },
      { status: 401 }
    );
  }

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    if (!decoded.email_verified) {
      return NextResponse.json(
        { error: "Email non vérifié" },
        { status: 403 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Session invalide" },
      { status: 401 }
    );
  }

  // Récupérer teamId depuis les paramètres de route
  const { teamId } = await params;

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


