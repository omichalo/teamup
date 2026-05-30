export const runtime = "nodejs";

import { FieldValue } from "firebase-admin/firestore";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/auth/audit-logger";
import { requireRegistrationManager } from "@/lib/club-registration/payment/api-auth";
import {
  normalizeRegistrationPayment,
  paymentToFirestoreUpdate,
} from "@/lib/club-registration/payment/normalize-payment";
import { setManualFollowUp } from "@/lib/club-registration/payment/payment-mutations";

const COLLECTION = "clubRegistrations";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!validateOrigin(req)) {
      return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
    }

    const auth = await requireRegistrationManager();
    if (!auth.ok) {
      return jsonNoStore({ error: auth.error }, { status: auth.status });
    }

    const { id } = await context.params;

    const db = getFirestoreAdmin();
    const docRef = db.collection(COLLECTION).doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return jsonNoStore({ error: "Dossier introuvable" }, { status: 404 });
    }

    const payment = normalizeRegistrationPayment(snap.data() ?? {});
    if (!payment) {
      return jsonNoStore({ error: "Aucune donnée de paiement sur ce dossier" }, { status: 400 });
    }

    const next = setManualFollowUp(payment);

    await docRef.set(
      {
        ...paymentToFirestoreUpdate(next),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    logAuditAction(AUDIT_ACTIONS.CLUB_REGISTRATION_UPDATED, auth.uid, {
      resource: "clubRegistration",
      resourceId: id,
      details: { action: "payment_manual_follow_up" },
      success: true,
    });

    return jsonNoStore({ payment: next }, { status: 200 });
  } catch (error) {
    console.error("[api/club/registration/payment/manual-follow-up POST]", error);
    return jsonNoStore({ error: "Impossible d’appliquer le suivi au bureau" }, { status: 500 });
  }
}
