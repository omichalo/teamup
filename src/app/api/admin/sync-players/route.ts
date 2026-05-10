import { jsonNoStore } from "@/lib/http/cache-headers";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { syncPlayers } from "@/lib/shared/sync-utils";
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

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;
    if (!sessionCookie) {
      return jsonNoStore(
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
      return jsonNoStore(
        {
          error: "Accès refusé",
          message: "Cette opération est réservée aux administrateurs",
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

    return jsonNoStore(result, { status: 200 });
  } catch (error) {
    console.error("❌ [app/api/admin/sync-players] Erreur lors de la synchronisation des joueurs:", error);
    return jsonNoStore(
      {
        success: false,
        error: "Erreur lors de la synchronisation des joueurs",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


