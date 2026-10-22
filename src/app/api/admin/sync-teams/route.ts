import { jsonNoStore } from "@/lib/http/cache-headers";
import { syncTeams } from "@/lib/shared/sync-utils";
import { initializeFirebaseAdmin, getFirestoreAdmin } from "@/lib/firebase-admin";
import { USER_ROLES } from "@/lib/auth/roles";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { logAuditAction, AUDIT_ACTIONS } from "@/lib/auth/audit-logger";
import {
  enforceRateLimit,
  RATE_LIMIT_ADMIN_SYNC_PER_UID,
} from "@/lib/auth/rate-limit-http";
import { withAuth } from "@/lib/auth/api-utils";
import type { DecodedIdToken } from "firebase-admin/auth";

export const runtime = "nodejs";

export const POST = withAuth(async (req: Request, context: unknown) => {
  const { decoded } = context as { decoded: DecodedIdToken };

  try {
    if (!validateOrigin(req)) {
      return jsonNoStore(
        { error: "Invalid origin", message: "Requête non autorisée" },
        { status: 403 }
      );
    }

    const syncRl = enforceRateLimit(
      `admin:sync-teams:${decoded.uid}`,
      RATE_LIMIT_ADMIN_SYNC_PER_UID.max,
      RATE_LIMIT_ADMIN_SYNC_PER_UID.windowMs
    );
    if (syncRl) return syncRl;

    console.log("🔄 [app/api/admin/sync-teams] Déclenchement de la synchronisation des équipes");

    await initializeFirebaseAdmin();
    const db = getFirestoreAdmin();
    const result = await syncTeams(db);

    logAuditAction(AUDIT_ACTIONS.DATA_SYNCED, decoded.uid, {
      resource: "teams",
      details: {
        teamsCount: result.teamsCount,
        errors: result.errors,
        duration: result.duration,
      },
      success: true,
    });

    return jsonNoStore(
      {
        success: true,
        message: result.message,
        data: {
          teamsCount: result.teamsCount,
          errors: result.errors,
          duration: result.duration,
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
}, [USER_ROLES.ADMIN]);
