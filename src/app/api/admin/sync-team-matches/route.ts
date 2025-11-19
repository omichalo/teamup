import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  initializeFirebaseAdmin,
  getFirestoreAdmin,
  adminAuth,
} from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
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

    console.log("🔄 [app/api/admin/sync-team-matches] Déclenchement de la synchronisation des matchs par équipe");

    await initializeFirebaseAdmin();
    const db = getFirestoreAdmin();

    const startTime = Date.now();
    const { TeamMatchesSyncService } = await import(
      "@/lib/shared/team-matches-sync"
    );
    const teamMatchesSyncService = new TeamMatchesSyncService();
    const syncResult = await teamMatchesSyncService.syncMatchesForAllTeams(db);

    if (!syncResult.success || !syncResult.processedMatches) {
      return NextResponse.json(
        {
          success: false,
          error: "Erreur lors de la synchronisation",
          details: syncResult.error || "Unknown error",
        },
        { status: 500 }
      );
    }

    const saveResult =
      await teamMatchesSyncService.saveMatchesToTeamSubcollections(
        syncResult.processedMatches,
        db
      );

    const duration = Date.now() - startTime;
    const durationSeconds = Math.round(duration / 1000);

    console.log(`💾 [sync-team-matches] Sauvegarde des métadonnées: teamMatchesCount=${saveResult.saved}, errors=${saveResult.errors}`);

    await db
      .collection("metadata")
      .doc("lastSync")
      .set(
        {
          teamMatches: Timestamp.fromDate(new Date()),
          teamMatchesCount: saveResult.saved,
          teamMatchesDuration: durationSeconds,
        },
        { merge: true }
      );
    
    console.log(`✅ [sync-team-matches] Métadonnées sauvegardées avec teamMatchesCount=${saveResult.saved}`);

    return NextResponse.json(
      {
        success: true,
        message: `Synchronisation des matchs réussie: ${saveResult.saved} matchs sauvegardés dans les sous-collections`,
        data: {
          matchesCount: saveResult.saved,
          errors: saveResult.errors,
          duration: durationSeconds,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ [app/api/admin/sync-team-matches] Erreur lors de la synchronisation des matchs:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la synchronisation des matchs",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


