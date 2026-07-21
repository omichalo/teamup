export const runtime = "nodejs";

import { FieldValue } from "firebase-admin/firestore";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/auth/audit-logger";
import { requireRegistrationManager } from "@/lib/club-registration/payment/api-auth";
import {
  isReceivedMethodIdSafe,
  normalizeRegistrationPayment,
  paymentToFirestoreUpdate,
} from "@/lib/club-registration/payment/normalize-payment";
import { addManualReceivedPayment } from "@/lib/club-registration/payment/payment-mutations";
import { normalizePaymentReference } from "@/lib/club-registration/payment/payment-reference";

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
    const body = ((await req.json().catch(() => ({}))) ?? {}) as {
      method?: string;
      label?: string;
      amountCents?: number;
      receivedAt?: string;
      note?: string;
      reference?: string;
    };

    if (!isReceivedMethodIdSafe(body.method)) {
      return jsonNoStore({ error: "Moyen de paiement invalide" }, { status: 400 });
    }
    if (!Number.isInteger(body.amountCents) || (body.amountCents as number) <= 0) {
      return jsonNoStore({ error: "Montant invalide" }, { status: 400 });
    }

    const receivedAt =
      typeof body.receivedAt === "string" && body.receivedAt
        ? body.receivedAt
        : new Date().toISOString();

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

    const reference = normalizePaymentReference(body.reference);
    const next = addManualReceivedPayment(payment, {
      method: body.method,
      label: body.label ?? "",
      amountCents: body.amountCents as number,
      receivedAt,
      recordedBy: auth.uid,
      ...(reference ? { reference } : {}),
      ...(typeof body.note === "string" && body.note.trim()
        ? { note: body.note.trim() }
        : {}),
    });

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
      details: { action: "payment_received_manual" },
      success: true,
    });

    return jsonNoStore({ payment: next }, { status: 200 });
  } catch (error) {
    console.error("[api/club/registration/payment/received POST]", error);
    return jsonNoStore({ error: "Impossible d'enregistrer le paiement" }, { status: 500 });
  }
}
