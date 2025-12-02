import type { NextRequest } from "next/server";
import {
  initializeFirebaseAdmin,
  getFirestoreAdmin,
} from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { requireAdmin } from "@/lib/api/auth-middleware";
import { createSecureResponse } from "@/lib/api/response-utils";
import { handleApiError, createErrorResponse } from "@/lib/api/error-handler";
import { logAuditAction, AUDIT_ACTIONS } from "@/lib/auth/audit-logger";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (auth instanceof Response) return auth;

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
      return createErrorResponse(
        "Erreur lors de la synchronisation",
        500,
        syncResult.error || "Unknown error"
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
    logAuditAction(AUDIT_ACTIONS.DATA_SYNCED, auth.uid, {
      resource: "team-matches",
      details: {
        matchesCount: saveResult.saved,
        errors: saveResult.errors,
        duration: durationSeconds,
      },
      success: true,
    });

    return createSecureResponse(
      {
        success: true,
        message: `Synchronisation des matchs réussie: ${saveResult.saved} matchs sauvegardés dans les sous-collections`,
        data: {
          matchesCount: saveResult.saved,
          errors: saveResult.errors,
          duration: durationSeconds,
        },
      },
      200
    );
  } catch (error) {
    return handleApiError(error, {
      context: "app/api/admin/sync-team-matches",
      defaultMessage: "Erreur lors de la synchronisation des matchs",
    });
  }
}


