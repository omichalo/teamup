import { jsonNoStore } from "@/lib/http/cache-headers";
import {
  initializeFirebaseAdmin,
  getFirestoreAdmin,
} from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
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
      `admin:sync-team-matches:${decoded.uid}`,
      RATE_LIMIT_ADMIN_SYNC_PER_UID.max,
      RATE_LIMIT_ADMIN_SYNC_PER_UID.windowMs
    );
    if (syncRl) return syncRl;

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
      return jsonNoStore(
        {
          success: false,
          error: "Erreur lors de la synchronisation",
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

    return jsonNoStore(
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
    return jsonNoStore(
      {
        success: false,
        error: "Erreur lors de la synchronisation des matchs",
      },
      { status: 500 }
    );
  }
}

export const POST = withAuth(postHandler, [USER_ROLES.ADMIN]);
