import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  initializeFirebaseAdmin,
  getFirestoreAdmin,
  adminAuth,
} from "@/lib/firebase-admin";
import { hasAnyRole, USER_ROLES, resolveRole } from "@/lib/auth/roles";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;
    if (!sessionCookie) {
      return NextResponse.json(
        {
          error: "Token d'authentification requis",
          message: "Cette API nécessite une authentification valide",
        },
        { status: 401 }
      );
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const role = resolveRole(decoded.role as string | undefined);

    if (!hasAnyRole(role, [USER_ROLES.ADMIN, USER_ROLES.COACH])) {
      return NextResponse.json(
        {
          error: "Accès refusé",
          message:
            "Cette opération est réservée aux administrateurs et coachs",
        },
        { status: 403 }
      );
    }

    console.log("🔄 [app/api/admin/sync-teams] Déclenchement de la synchronisation des équipes directe");

    await initializeFirebaseAdmin();
    const db = getFirestoreAdmin();

    const startTime = Date.now();
    const { TeamSyncService } = await import("@/lib/shared/team-sync");
    const teamSyncService = new TeamSyncService();
    const syncResult = await teamSyncService.syncTeamsAndMatches();

    if (!syncResult.success || !syncResult.processedTeams) {
      return NextResponse.json(
        {
          success: false,
          error: "Erreur lors de la synchronisation",
          details: syncResult.error || "Unknown error",
        },
        { status: 500 }
      );
    }

    const saveResult = await teamSyncService.saveTeamsAndMatchesToFirestore(
      syncResult.processedTeams,
      db
    );

    const duration = Date.now() - startTime;
    const durationSeconds = Math.round(duration / 1000);

    // Sauvegarder la durée dans les métadonnées
    await db.collection("metadata").doc("lastSync").set(
      {
        teamsDuration: durationSeconds,
      },
      { merge: true }
    );

    return NextResponse.json(
      {
        success: true,
        message: `Synchronisation des équipes réussie: ${saveResult.saved} équipes sauvegardées`,
        data: {
          teamsCount: saveResult.saved,
          errors: saveResult.errors,
          duration: durationSeconds,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ [app/api/admin/sync-teams] Erreur lors de la synchronisation des équipes:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la synchronisation des équipes",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


