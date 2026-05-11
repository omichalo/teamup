export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { cookies } from "next/headers";
import { getFirestoreAdmin, adminAuth } from "@/lib/firebase-admin";
import { hasAnyRole, USER_ROLES, resolveRole } from "@/lib/auth/roles";

const COLLECTION = "clubRegistrations";

/** Champs renvoyés en mode "liste" (synthèse, pas la totalité du dossier). */
const LIST_FIELDS = [
  "adherentRole",
  "firstName",
  "lastName",
  "birthDate",
  "isMinor",
  "mainSectionId",
  "status",
  "submitterUid",
  "submitterAccountEmail",
] as const;

/** GET /api/club/registrations — liste des dossiers du soumettant connecté. */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;
    if (!sessionCookie) {
      return jsonNoStore({ error: "Authentification requise" }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const role = resolveRole(decoded.role as string | undefined);
    if (!hasAnyRole(role, [USER_ROLES.PLAYER, USER_ROLES.COACH, USER_ROLES.ADMIN])) {
      return jsonNoStore({ error: "Accès refusé" }, { status: 403 });
    }

    const db = getFirestoreAdmin();
    const snap = await db
      .collection(COLLECTION)
      .where("submitterUid", "==", decoded.uid)
      .orderBy("submittedAt", "desc")
      .limit(20)
      .get();

    const registrations = snap.docs.map((doc) => {
      const data = doc.data();
      const summary: Record<string, unknown> = { id: doc.id };
      for (const key of LIST_FIELDS) {
        if (data[key] !== undefined) {
          summary[key] = data[key];
        }
      }
      summary.submittedAt = data.submittedAt?.toDate?.()?.toISOString?.() ?? null;
      summary.updatedAt = data.updatedAt?.toDate?.()?.toISOString?.() ?? null;
      return summary;
    });

    return jsonNoStore({ registrations }, { status: 200 });
  } catch (error) {
    console.error("[api/club/registrations GET]", error);
    return jsonNoStore({ error: "Impossible de charger les dossiers" }, { status: 500 });
  }
}
