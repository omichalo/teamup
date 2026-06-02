import { jsonNoStore } from "@/lib/http/cache-headers";
import { syncPlayers } from "@/lib/shared/sync-utils";
import { initializeFirebaseAdmin, getFirestoreAdmin } from "@/lib/firebase-admin";
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
      `admin:sync-players:${decoded.uid}`,
      RATE_LIMIT_ADMIN_SYNC_PER_UID.max,
      RATE_LIMIT_ADMIN_SYNC_PER_UID.windowMs
    );
    if (syncRl) return syncRl;

    console.log("🔄 [app/api/admin/sync-players] Déclenchement de la synchronisation des joueurs directe");

    await initializeFirebaseAdmin();
    const db = getFirestoreAdmin();
    const result = await syncPlayers(db);

    // Log d'audit pour la synchronisation
    logAuditAction(AUDIT_ACTIONS.DATA_SYNCED, decoded.uid, {
      resource: "players",
      details: {
        success: result.success,
        playersCount: result.playersCount,
        duration: result.duration,
      },
      success: result.success,
    });

    // Sanitize the result to avoid leaking details if success is false
    if (!result.success) {
      return jsonNoStore(
        {
          success: false,
          error: "Erreur lors de la synchronisation des joueurs",
        },
        { status: 500 }
      );
    }

    return jsonNoStore(result, { status: 200 });
  } catch (error) {
    console.error("❌ [app/api/admin/sync-players] Erreur lors de la synchronisation des joueurs:", error);
    return jsonNoStore(
      {
        success: false,
        error: "Erreur lors de la synchronisation des joueurs",
      },
      { status: 500 }
    );
  }
}

export const POST = withAuth(postHandler, [USER_ROLES.ADMIN]);
