import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/auth/audit-logger";
import { COLLECTION } from "@/lib/club-registration/list-registrations";
import { normalizeRegistrationPayment } from "@/lib/club-registration/payment/normalize-payment";
import {
  isReceivedPaymentReversible,
  reverseReceivedPayment,
} from "@/lib/club-registration/payment/payment-mutations";
import { paymentWriteWithSettlement } from "@/lib/club-registration/payment/settlement-firestore";
import { syncRosterAfterRegistrationChange } from "@/lib/championship/sync-after-registration";

export type ReverseReceivedPaymentResult =
  | { ok: true }
  | { ok: false; status: number; error: string; code?: string };

export async function reverseRegistrationReceivedPayment(
  db: Firestore,
  registrationId: string,
  receivedId: string,
  actorUid: string,
  reason: string
): Promise<ReverseReceivedPaymentResult> {
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    return { ok: false, status: 400, error: "Motif d'annulation requis" };
  }

  const docRef = db.collection(COLLECTION).doc(registrationId);
  const snap = await docRef.get();
  if (!snap.exists) {
    return { ok: false, status: 404, error: "Dossier introuvable" };
  }

  const data = snap.data() ?? {};
  const payment = normalizeRegistrationPayment(data);
  if (!payment) {
    return { ok: false, status: 400, error: "Aucune donnée de paiement sur ce dossier" };
  }

  const received = payment.receivedPayments.find((line) => line.id === receivedId);
  if (!received) {
    return { ok: false, status: 404, error: "Encaissement introuvable" };
  }
  if (!isReceivedPaymentReversible(received)) {
    return {
      ok: false,
      status: 400,
      error: "Cet encaissement ne peut pas être annulé depuis l'application",
      code: "PAYMENT_NOT_REVERSIBLE",
    };
  }

  const previousRegistrationStatus =
    typeof data.status === "string" ? data.status : undefined;

  const nextPayment = reverseReceivedPayment(payment, receivedId, {
    reason: trimmedReason,
    reversedBy: actorUid,
  });
  if (!nextPayment) {
    return { ok: false, status: 400, error: "Impossible d'annuler cet encaissement" };
  }

  await docRef.set(
    {
      ...paymentWriteWithSettlement(nextPayment, {
        ...(previousRegistrationStatus
          ? { previousRegistrationStatus }
          : {}),
      }),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  logAuditAction(AUDIT_ACTIONS.CLUB_REGISTRATION_UPDATED, actorUid, {
    resource: "clubRegistration",
    resourceId: registrationId,
    details: {
      action: "payment_received_reversed",
      receivedId,
      amountCents: received.amountCents,
      method: received.method,
    },
    success: true,
  });

  await syncRosterAfterRegistrationChange(db, registrationId);

  return { ok: true };
}

export async function reverseRegistrationReceivedPaymentFromRequest(
  req: Request,
  db: Firestore,
  registrationId: string,
  receivedId: string,
  actorUid: string
) {
  if (!validateOrigin(req)) {
    return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
  }

  const body = ((await req.json().catch(() => ({}))) ?? {}) as { reason?: string };
  const result = await reverseRegistrationReceivedPayment(
    db,
    registrationId,
    receivedId,
    actorUid,
    typeof body.reason === "string" ? body.reason : ""
  );

  if (!result.ok) {
    return jsonNoStore(
      { error: result.error, ...(result.code ? { code: result.code } : {}) },
      { status: result.status }
    );
  }

  return jsonNoStore({ success: true }, { status: 200 });
}
