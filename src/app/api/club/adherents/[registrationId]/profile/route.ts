export const runtime = "nodejs";

import { cookies } from "next/headers";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { adminAuth, getFirestoreAdmin } from "@/lib/firebase-admin";
import { resolveRole } from "@/lib/auth/roles";
import {
  canViewClubRegistration,
  isClubRegistrationManager,
} from "@/lib/club-registration/registration-access";
import { getActiveRegistrationConfig } from "@/lib/club-registration-config/store";
import { listMarksForRegistration } from "@/lib/attendance/list-marks-for-registration";
import { buildMemberProfile } from "@/lib/member-profile/build-member-profile";

const COLLECTION = "clubRegistrations";

/**
 * GET /api/club/adherents/[registrationId]/profile
 * Fiche adhérent (créneaux, présences, finances) — propriétaire ou rôles spreadsheet.
 * Lecture seule : n'attribue aucun numéro comptable.
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ registrationId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;
    if (!sessionCookie) {
      return jsonNoStore({ error: "Authentification requise" }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const role = resolveRole(decoded.role as string | undefined);
    const { registrationId } = await context.params;

    if (!registrationId?.trim()) {
      return jsonNoStore({ error: "Identifiant manquant" }, { status: 400 });
    }

    const db = getFirestoreAdmin();
    const snap = await db.collection(COLLECTION).doc(registrationId).get();
    if (!snap.exists) {
      return jsonNoStore({ error: "Dossier introuvable" }, { status: 404 });
    }

    const data = (snap.data() ?? {}) as Record<string, unknown>;
    const submitterUid =
      typeof data.submitterUid === "string" ? data.submitterUid : undefined;

    if (!canViewClubRegistration(role, submitterUid, decoded.uid)) {
      return jsonNoStore({ error: "Accès refusé" }, { status: 403 });
    }

    const [config, marks] = await Promise.all([
      getActiveRegistrationConfig(),
      listMarksForRegistration(db, registrationId),
    ]);

    const profile = buildMemberProfile({
      registrationId,
      data,
      config,
      marks,
      viewerUid: decoded.uid,
      canManage: isClubRegistrationManager(role),
    });

    return jsonNoStore(profile, { status: 200 });
  } catch (error) {
    console.error("[api/club/adherents/profile GET]", error);
    return jsonNoStore(
      { error: "Impossible de charger la fiche adhérent" },
      { status: 500 }
    );
  }
}
