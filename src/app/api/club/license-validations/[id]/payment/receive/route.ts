export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { requireLicenseValidationActor } from "@/lib/license-validation/api-auth";
import { receiveLicenseValidationPaymentFromRequest } from "@/lib/license-validation/receive-payment";

export async function POST(
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
    return receiveLicenseValidationPaymentFromRequest(req, db, id, auth.uid);
  } catch (error) {
    console.error(
      "[api/club/license-validations/[id]/payment/receive POST] error",
      error
    );
    return jsonNoStore(
      {
        error: "Erreur lors de l'enregistrement du paiement",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
