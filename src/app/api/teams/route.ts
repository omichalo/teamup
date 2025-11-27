import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { initializeFirebaseAdmin, getFirestoreAdmin, adminAuth } from "@/lib/firebase-admin";
import { getTeams, TeamSummary } from "@/lib/server/team-matches";
import { hasAnyRole, USER_ROLES, resolveRole } from "@/lib/auth/roles";

export const runtime = "nodejs";

export async function GET() {
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

    // Vérifier que l'utilisateur est admin ou coach
    const role = resolveRole(decoded.role as string | undefined);
    if (!hasAnyRole(role, [USER_ROLES.ADMIN, USER_ROLES.COACH])) {
      return NextResponse.json(
        { error: "Accès refusé" },
        { status: 403 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Session invalide" },
      { status: 401 }
    );
  }
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


