import type { NextRequest } from "next/server";
import { syncPlayers } from "@/lib/shared/sync-utils";
import { initializeFirebaseAdmin, getFirestoreAdmin } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/api/auth-middleware";
import { createSecureResponse } from "@/lib/api/response-utils";
import { handleApiError } from "@/lib/api/error-handler";
import { logAuditAction, AUDIT_ACTIONS } from "@/lib/auth/audit-logger";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (auth instanceof Response) return auth;

    console.log("🔄 [app/api/admin/sync-players] Déclenchement de la synchronisation des joueurs directe");

    await initializeFirebaseAdmin();
    const db = getFirestoreAdmin();
    const result = await syncPlayers(db);

    // Log d'audit pour la synchronisation
    logAuditAction(AUDIT_ACTIONS.DATA_SYNCED, auth.uid, {
      resource: "players",
      details: {
        success: result.success,
        playersCount: result.playersCount,
        duration: result.duration,
      },
      success: result.success,
    });

    return createSecureResponse(result, 200);
  } catch (error) {
    return handleApiError(error, {
      context: "app/api/admin/sync-players",
      defaultMessage: "Erreur lors de la synchronisation des joueurs",
    });
  }
}


