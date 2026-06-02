import { jsonNoStore } from "@/lib/http/cache-headers";
import {
  initializeFirebaseAdmin,
  getFirestoreAdmin,
} from "@/lib/firebase-admin";
import { USER_ROLES } from "@/lib/auth/roles";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { logAuditAction, AUDIT_ACTIONS } from "@/lib/auth/audit-logger";
import {
  enforceRateLimit,
  RATE_LIMIT_ADMIN_SYNC_PER_UID,
} from "@/lib/auth/rate-limit-http";
import { withAuth } from "@/lib/auth/api-utils";
import { DecodedIdToken } from "firebase-admin/auth";

export const runtime = "nodejs";

async function postHandler(req: Request, context: unknown) {
  try {
    const { decoded } = context as { decoded: DecodedIdToken };

    // Valider l'origine de la requête pour prévenir les attaques CSRF
    if (!validateOrigin(req)) {
      return jsonNoStore(
        {
          error: "Invalid origin",
          message: "Requête non autorisée",
        },
        { status: 403 }
      );
    }

    const syncRl = enforceRateLimit(
      `admin:sync-teams:${decoded.uid}`,
      RATE_LIMIT_ADMIN_SYNC_PER_UID.max,
      RATE_LIMIT_ADMIN_SYNC_PER_UID.windowMs
    );
    if (syncRl) return syncRl;

    console.log("🔄 [app/api/admin/sync-teams] Déclenchement de la synchronisation des équipes directe");

    await initializeFirebaseAdmin();
    const db = getFirestoreAdmin();

    const startTime = Date.now();
    const { TeamSyncService } = await import("@/lib/shared/team-sync");
    const teamSyncService = new TeamSyncService();
    const syncResult = await teamSyncService.syncTeamsAndMatches();

    if (!syncResult.success || !syncResult.processedTeams) {
      return jsonNoStore(
        {
          success: false,
          error: "Erreur lors de la synchronisation",
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

    // Log d'audit pour la synchronisation
    logAuditAction(AUDIT_ACTIONS.DATA_SYNCED, decoded.uid, {
      resource: "teams",
      details: {
        teamsCount: saveResult.saved,
        errors: saveResult.errors,
        duration: durationSeconds,
      },
      success: true,
    });

    return jsonNoStore(
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
    return jsonNoStore(
      {
        success: false,
        error: "Erreur lors de la synchronisation des équipes",
      },
      { status: 500 }
    );
  }
}

export const POST = withAuth(postHandler, [USER_ROLES.ADMIN]);
