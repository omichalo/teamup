export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { cookies } from "next/headers";
import { getFirestoreAdmin, adminAuth } from "@/lib/firebase-admin";
import { hasAnyRole, USER_ROLES, resolveRole } from "@/lib/auth/roles";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import {
  loadRegistrationsSpreadsheetPreferences,
  saveRegistrationsSpreadsheetPreferences,
} from "@/lib/club-registration/spreadsheet/preferences-store";
import { validateSpreadsheetPreferencesPayload } from "@/lib/club-registration/spreadsheet/preferences";

const MANAGER_ROLES = [USER_ROLES.ADMIN, USER_ROLES.SECRETARY] as const;

/** GET /api/club/registrations/spreadsheet-preferences — préférences colonnes utilisateur. */
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
    const preferences = await loadRegistrationsSpreadsheetPreferences(db, decoded.uid);

    return jsonNoStore({ preferences }, { status: 200 });
  } catch (error) {
    console.error("[api/club/registrations/spreadsheet-preferences GET]", error);
    return jsonNoStore({ error: "Impossible de charger les préférences" }, { status: 500 });
  }
}

/** PUT /api/club/registrations/spreadsheet-preferences — enregistre colonnes visibles et ordre. */
export async function PUT(req: Request) {
  try {
    if (!validateOrigin(req)) {
      return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
    }

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

    const body = await req.json();
    const validation = validateSpreadsheetPreferencesPayload(body?.preferences ?? body);
    if (!validation.ok) {
      return jsonNoStore({ error: validation.error }, { status: 400 });
    }

    const db = getFirestoreAdmin();
    const preferences = await saveRegistrationsSpreadsheetPreferences(
      db,
      decoded.uid,
      validation.preferences
    );

    return jsonNoStore({ preferences }, { status: 200 });
  } catch (error) {
    console.error("[api/club/registrations/spreadsheet-preferences PUT]", error);
    return jsonNoStore({ error: "Impossible d'enregistrer les préférences" }, { status: 500 });
  }
}
