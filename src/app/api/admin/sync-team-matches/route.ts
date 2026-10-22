import { jsonNoStore } from "@/lib/http/cache-headers";
import { syncTeamMatches } from "@/lib/shared/sync-utils";
import { getFirestoreAdmin } from "@/lib/firebase-admin";
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

export const POST = withAuth(async (req, context) => {
  try {
    const { decoded } = context as { decoded: DecodedIdToken };

    if (!validateOrigin(req)) {
      return jsonNoStore(
        { error: "Invalid origin" },
        { status: 403 }
      );
    }

    const syncRl = enforceRateLimit(
      `admin:sync-team-matches:${decoded.uid}`,
      RATE_LIMIT_ADMIN_SYNC_PER_UID.max,
      RATE_LIMIT_ADMIN_SYNC_PER_UID.windowMs
    );
    if (syncRl) return syncRl;

    console.log(
      "🔄 [app/api/admin/sync-team-matches] Déclenchement de la synchronisation des matchs par équipe"
    );

    const db = getFirestoreAdmin();
    const result = await syncTeamMatches(db);

    logAuditAction(AUDIT_ACTIONS.DATA_SYNCED, decoded.uid, {
      resource: "team-matches",
      details: {
        matchesCount: result.matchesCount,
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
          matchesCount: result.matchesCount,
          errors: result.errors,
          duration: result.duration,
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
}, [USER_ROLES.ADMIN]);
