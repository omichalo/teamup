export const runtime = "nodejs";

import { cookies } from "next/headers";
import { initializeFirebaseAdmin, getFirestoreAdmin, adminAuth } from "@/lib/firebase-admin";
import { hasAnyRole, USER_ROLES, resolveRole } from "@/lib/auth/roles";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { patchAvailabilitiesSchema, toPlayerAvailabilityUpdates } from "@/lib/availability/api-schema";
import { applyPlayerAvailabilityUpdates } from "@/lib/availability/firestore-persistence";

export async function PATCH(req: Request) {
  if (!validateOrigin(req)) {
    return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
  }

  const sessionCookie = (await cookies()).get("__session")?.value;
  if (!sessionCookie) {
    return jsonNoStore({ error: "Authentification requise" }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    if (!decoded.email_verified) {
      return jsonNoStore({ error: "Email non vérifié" }, { status: 403 });
    }

    const role = resolveRole(decoded.role as string | undefined);
    if (!hasAnyRole(role, [USER_ROLES.ADMIN, USER_ROLES.COACH])) {
      return jsonNoStore({ error: "Accès refusé" }, { status: 403 });
    }

    uid = decoded.uid;
  } catch {
    return jsonNoStore({ error: "Session invalide" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonNoStore({ error: "Corps de requête JSON invalide" }, { status: 400 });
  }

  const parsed = patchAvailabilitiesSchema.safeParse(body);
  if (!parsed.success) {
    return jsonNoStore(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { journee, phase, championshipType, idEpreuve, date, playerUpdates } =
    parsed.data;

  try {
    await initializeFirebaseAdmin();
    const db = getFirestoreAdmin();

    await applyPlayerAvailabilityUpdates(db, {
      journee,
      phase,
      championshipType,
      ...(idEpreuve !== undefined ? { idEpreuve } : {}),
      ...(date !== undefined ? { date } : {}),
      playerUpdates: toPlayerAvailabilityUpdates(playerUpdates),
    });

    if (process.env.NODE_ENV === "development" && process.env.DEBUG === "true") {
      console.log("[api/availabilities] PATCH applied", {
        uid,
        journee,
        phase,
        championshipType,
        playerCount: playerUpdates.length,
      });
    }

    return jsonNoStore({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[api/availabilities] PATCH error:", error);
    return jsonNoStore(
      { error: "Impossible de mettre à jour les disponibilités" },
      { status: 500 }
    );
  }
}
