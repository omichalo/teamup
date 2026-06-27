export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { cookies } from "next/headers";
import { getFirestoreAdmin, adminAuth } from "@/lib/firebase-admin";
import { hasAnyRole, USER_ROLES, resolveRole } from "@/lib/auth/roles";
import { getManagedQueueSummary } from "@/lib/club-registration/list-registrations";

const MANAGER_ROLES = [USER_ROLES.ADMIN, USER_ROLES.SECRETARY] as const;

/** GET /api/club/registrations/managed-summary — compteurs file secrétariat. */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;
    if (!sessionCookie) {
      return jsonNoStore({ error: "Authentification requise" }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const role = resolveRole(decoded.role as string | undefined);
    if (!hasAnyRole(role, MANAGER_ROLES)) {
      return jsonNoStore({ error: "Accès refusé" }, { status: 403 });
    }

    const db = getFirestoreAdmin();
    const summary = await getManagedQueueSummary(db);

    return jsonNoStore({ summary }, { status: 200 });
  } catch (error) {
    console.error("[api/club/registrations/managed-summary GET]", error);
    return jsonNoStore({ error: "Impossible de charger la synthèse" }, { status: 500 });
  }
}
