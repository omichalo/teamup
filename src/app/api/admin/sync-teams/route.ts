import type { NextRequest } from "next/server";
import {
  initializeFirebaseAdmin,
  getFirestoreAdmin,
} from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/api/auth-middleware";
import { createSecureResponse } from "@/lib/api/response-utils";
import { handleApiError, createErrorResponse } from "@/lib/api/error-handler";
import { logAuditAction, AUDIT_ACTIONS } from "@/lib/auth/audit-logger";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (auth instanceof Response) return auth;

    console.log(
      "🔄 [app/api/admin/sync-teams] Déclenchement de la synchronisation des équipes directe"
    );

    await initializeFirebaseAdmin();
    const db = getFirestoreAdmin();

    const startTime = Date.now();
    const { TeamSyncService } = await import("@/lib/shared/team-sync");
    const teamSyncService = new TeamSyncService();
    const syncResult = await teamSyncService.syncTeamsAndMatches();

    if (!syncResult.success || !syncResult.processedTeams) {
      return createErrorResponse(
        "Erreur lors de la synchronisation",
        500,
        syncResult.error || "Unknown error"
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

    // Log d'audit pour la synchronisation
    logAuditAction(AUDIT_ACTIONS.DATA_SYNCED, auth.uid, {
      resource: "teams",
      details: {
        teamsCount: saveResult.saved,
        errors: saveResult.errors,
        duration: durationSeconds,
      },
      success: true,
    });

    return createSecureResponse(
      {
        success: true,
        message: `Synchronisation des équipes réussie: ${saveResult.saved} équipes sauvegardées`,
        data: {
          teamsCount: saveResult.saved,
          errors: saveResult.errors,
          duration: durationSeconds,
        },
      },
      200
    );
  } catch (error) {
    return handleApiError(error, {
      context: "app/api/admin/sync-teams",
      defaultMessage: "Erreur lors de la synchronisation des équipes",
    });
  }
}
