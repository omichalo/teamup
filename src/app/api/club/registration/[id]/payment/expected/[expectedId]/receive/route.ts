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
import { markExpectedPaymentReceived } from "@/lib/club-registration/payment/payment-mutations";

const COLLECTION = "clubRegistrations";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string; expectedId: string }> }
) {
  try {
    if (!validateOrigin(req)) {
      return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
    }

    const auth = await requireRegistrationManager();
    if (!auth.ok) {
      return jsonNoStore({ error: auth.error }, { status: auth.status });
    }

    const { id, expectedId } = await context.params;
    const body = ((await req.json().catch(() => ({}))) ?? {}) as {
      amountCents?: number;
      receivedAt?: string;
      note?: string;
    };

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

    const expected = payment.expectedPayments.find((e) => e.id === expectedId);
    if (!expected) {
      return jsonNoStore({ error: "Échéance introuvable" }, { status: 404 });
    }

    const amountCents =
      Number.isInteger(body.amountCents) && (body.amountCents as number) > 0
        ? (body.amountCents as number)
        : expected.expectedAmountCents;

    const receivedAt =
      typeof body.receivedAt === "string" && body.receivedAt
        ? body.receivedAt
        : new Date().toISOString();

    const next = markExpectedPaymentReceived(payment, expectedId, {
      amountCents,
      receivedAt,
      recordedBy: auth.uid,
      ...(typeof body.note === "string" && body.note.trim()
        ? { note: body.note.trim() }
        : {}),
    });

    if (!next) {
      return jsonNoStore({ error: "Impossible de marquer cette échéance" }, { status: 400 });
    }

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
      details: { action: "expected_payment_received", expectedId },
      success: true,
    });

    return jsonNoStore({ payment: next }, { status: 200 });
  } catch (error) {
    console.error("[api/club/registration/payment/expected/receive POST]", error);
    return jsonNoStore(
      { error: "Impossible d'enregistrer la réception de l'échéance" },
      { status: 500 }
    );
  }
}
