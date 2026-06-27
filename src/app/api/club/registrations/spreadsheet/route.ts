export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { cookies } from "next/headers";
import { getFirestoreAdmin, adminAuth } from "@/lib/firebase-admin";
import { hasAnyRole, USER_ROLES, resolveRole } from "@/lib/auth/roles";
import { listSpreadsheetRegistrations } from "@/lib/club-registration/list-spreadsheet-registrations";
import { buildSpreadsheetUserLabelDirectory } from "@/lib/club-registration/spreadsheet/build-user-label-directory";

const MANAGER_ROLES = [USER_ROLES.ADMIN, USER_ROLES.SECRETARY] as const;

/** GET /api/club/registrations/spreadsheet — export tabulaire (secrétariat). */
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
    const result = await listSpreadsheetRegistrations(db);
    const userLabels = await buildSpreadsheetUserLabelDirectory(db, result.registrations);

    return jsonNoStore(
      {
        registrations: result.registrations,
        totalCount: result.totalCount,
        truncated: result.truncated,
        userLabels,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[api/club/registrations/spreadsheet GET]", error);
    return jsonNoStore({ error: "Impossible de charger le tableau" }, { status: 500 });
  }
}
