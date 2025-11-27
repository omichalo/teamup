import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import {
  initializeFirebaseAdmin,
  getFirestoreAdmin,
  adminAuth,
} from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { hasAnyRole, USER_ROLES, resolveRole } from "@/lib/auth/roles";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { logAuditAction, AUDIT_ACTIONS } from "@/lib/auth/audit-logger";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // Valider l'origine de la requête pour prévenir les attaques CSRF
    if (!validateOrigin(req)) {
      return NextResponse.json(
        {
          error: "Invalid origin",
          message: "Requête non autorisée",
        },
        { status: 403 }
      );
    }

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

    if (!hasAnyRole(role, [USER_ROLES.ADMIN])) {
      return NextResponse.json(
        {
          error: "Accès refusé",
          message: "Cette opération est réservée aux administrateurs",
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

    // Log d'audit pour la synchronisation
    logAuditAction(AUDIT_ACTIONS.DATA_SYNCED, decoded.uid, {
      resource: "team-matches",
      details: {
        matchesCount: saveResult.saved,
        errors: saveResult.errors,
        duration: durationSeconds,
      },
      success: true,
    });

    const res = NextResponse.json(
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
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    return res;
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


