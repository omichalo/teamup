import { jsonNoStore } from "@/lib/http/cache-headers";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { syncTeamMatches } from "@/lib/shared/sync-utils";
import { initializeFirebaseAdmin, getFirestoreAdmin, adminAuth } from "@/lib/firebase-admin";
import { hasAnyRole, USER_ROLES, resolveRole } from "@/lib/auth/roles";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { logAuditAction, AUDIT_ACTIONS } from "@/lib/auth/audit-logger";
import {
  enforceRateLimit,
  RATE_LIMIT_ADMIN_SYNC_PER_UID,
} from "@/lib/auth/rate-limit-http";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    if (!validateOrigin(req)) {
      return jsonNoStore(
        { error: "Invalid origin", message: "Requête non autorisée" },
        { status: 403 }
      );
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;
    if (!sessionCookie) {
      return jsonNoStore(
        { error: "Token d'authentification requis", message: "Cette API nécessite une authentification valide" },
        { status: 401 }
      );
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const role = resolveRole(decoded.role as string | undefined);

    if (!hasAnyRole(role, [USER_ROLES.ADMIN])) {
      return jsonNoStore(
        { error: "Accès refusé", message: "Cette opération est réservée aux administrateurs" },
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

    await initializeFirebaseAdmin();
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
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
