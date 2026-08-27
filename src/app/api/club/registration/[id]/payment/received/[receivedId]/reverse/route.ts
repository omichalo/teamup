export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { requireRegistrationManager } from "@/lib/club-registration/payment/api-auth";
import { reverseRegistrationReceivedPaymentFromRequest } from "@/lib/club-registration/payment/reverse-received-payment";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string; receivedId: string }> }
) {
  try {
    const auth = await requireRegistrationManager();
    if (!auth.ok) {
      return jsonNoStore({ error: auth.error }, { status: auth.status });
    }

    const { id, receivedId } = await context.params;
    const db = getFirestoreAdmin();
    return reverseRegistrationReceivedPaymentFromRequest(
      req,
      db,
      id,
      receivedId,
      auth.uid
    );
  } catch (error) {
    console.error(
      "[api/club/registration/payment/received/[receivedId]/reverse POST]",
      error
    );
    return jsonNoStore({ error: "Impossible d'annuler l'encaissement" }, { status: 500 });
  }
}
