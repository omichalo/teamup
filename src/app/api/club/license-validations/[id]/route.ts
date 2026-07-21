export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { requireLicenseValidationActor } from "@/lib/license-validation/api-auth";
import { COLLECTION } from "@/lib/club-registration/list-registrations";
import { mapRegistrationToLicenseValidationDetail } from "@/lib/license-validation/map-registration";
import { patchLicenseValidationFromRequest } from "@/lib/license-validation/patch-license-validation";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireLicenseValidationActor();
    if (!auth.ok) {
      return jsonNoStore({ error: auth.error }, { status: auth.status });
    }

    const { id } = await context.params;
    const db = getFirestoreAdmin();
    const snap = await db.collection(COLLECTION).doc(id).get();
    if (!snap.exists) {
      return jsonNoStore({ error: "Dossier introuvable" }, { status: 404 });
    }

    return jsonNoStore({
      registration: mapRegistrationToLicenseValidationDetail(snap),
    });
  } catch (error) {
    console.error("[api/club/license-validations/[id] GET] error", error);
    return jsonNoStore(
      {
        error: "Erreur lors du chargement du dossier",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireLicenseValidationActor();
    if (!auth.ok) {
      return jsonNoStore({ error: auth.error }, { status: auth.status });
    }

    const { id } = await context.params;
    const db = getFirestoreAdmin();
    return patchLicenseValidationFromRequest(req, db, id, auth.uid);
  } catch (error) {
    console.error("[api/club/license-validations/[id] PATCH] error", error);
    return jsonNoStore(
      {
        error: "Erreur lors de la mise à jour du dossier",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
