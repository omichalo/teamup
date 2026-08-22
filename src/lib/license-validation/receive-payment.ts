import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/auth/audit-logger";
import { COLLECTION } from "@/lib/club-registration/list-registrations";
import {
  addManualReceivedPayment,
  markExpectedPaymentReceived,
} from "@/lib/club-registration/payment/payment-mutations";
import {
  normalizeRegistrationPayment,
  paymentToFirestoreUpdate,
} from "@/lib/club-registration/payment/normalize-payment";
import {
  RECEIVED_PAYMENT_METHOD_IDS,
  RECEIVED_PAYMENT_METHOD_LABELS,
  type ReceivedPaymentMethodId,
} from "@/lib/club-registration/payment-constants";
import { normalizePaymentReference } from "@/lib/club-registration/payment/payment-reference";
import { wouldCreateOverpayment } from "@/lib/club-registration/payment/overpayment";
import { syncRosterAfterRegistrationChange } from "@/lib/championship/sync-after-registration";

const ALLOWED_METHODS = new Set<ReceivedPaymentMethodId>(RECEIVED_PAYMENT_METHOD_IDS);

export type ReceiveLicenseValidationPaymentInput = {
  mode?: "expected" | "manual";
  expectedId?: string;
  method?: string;
  label?: string;
  amountCents?: number;
  receivedAt?: string;
  note?: string;
  reference?: string;
  /** Requis si le montant dépasse le reste dû (trop-perçu). */
  confirmOverpayment?: boolean;
};

export type ReceiveLicenseValidationPaymentResult =
  | { ok: true }
  | { ok: false; status: number; error: string; code?: string };

function isAllowedMethod(method: string): method is ReceivedPaymentMethodId {
  return ALLOWED_METHODS.has(method as ReceivedPaymentMethodId);
}

export { wouldCreateOverpayment };

export async function receiveLicenseValidationPayment(
  db: Firestore,
  registrationId: string,
  actorUid: string,
  body: ReceiveLicenseValidationPaymentInput
): Promise<ReceiveLicenseValidationPaymentResult> {
  const docRef = db.collection(COLLECTION).doc(registrationId);
  const snap = await docRef.get();
  if (!snap.exists) {
    return { ok: false, status: 404, error: "Dossier introuvable" };
  }

  const payment = normalizeRegistrationPayment(snap.data() ?? {});
  if (!payment) {
    return { ok: false, status: 400, error: "Aucune donnée de paiement sur ce dossier" };
  }

  const receivedAt =
    typeof body.receivedAt === "string" && body.receivedAt
      ? body.receivedAt
      : new Date().toISOString();

  const reference = normalizePaymentReference(body.reference);

  let nextPayment = null;

  if (body.mode === "expected") {
    if (!body.expectedId) {
      return { ok: false, status: 400, error: "Échéance de paiement requise" };
    }
    if (!Number.isInteger(body.amountCents) || (body.amountCents as number) <= 0) {
      return { ok: false, status: 400, error: "Montant invalide" };
    }
    if (
      wouldCreateOverpayment(payment.remainingAmountCents, body.amountCents as number) &&
      body.confirmOverpayment !== true
    ) {
      return {
        ok: false,
        status: 400,
        error: "Ce montant dépasse le reste dû. Confirmez le trop-perçu.",
        code: "OVERPAYMENT_CONFIRMATION_REQUIRED",
      };
    }
    nextPayment = markExpectedPaymentReceived(payment, body.expectedId, {
      amountCents: body.amountCents as number,
      receivedAt,
      recordedBy: actorUid,
      ...(reference ? { reference } : {}),
      ...(typeof body.note === "string" && body.note.trim()
        ? { note: body.note.trim() }
        : {}),
    });
  } else {
    if (!body.method || !isAllowedMethod(body.method)) {
      return {
        ok: false,
        status: 400,
        error: "Moyen de paiement invalide",
      };
    }
    if (!Number.isInteger(body.amountCents) || (body.amountCents as number) <= 0) {
      return { ok: false, status: 400, error: "Montant invalide" };
    }
    if (
      wouldCreateOverpayment(payment.remainingAmountCents, body.amountCents as number) &&
      body.confirmOverpayment !== true
    ) {
      return {
        ok: false,
        status: 400,
        error: "Ce montant dépasse le reste dû. Confirmez le trop-perçu.",
        code: "OVERPAYMENT_CONFIRMATION_REQUIRED",
      };
    }
    nextPayment = addManualReceivedPayment(payment, {
      method: body.method,
      label:
        (typeof body.label === "string" && body.label.trim()) ||
        RECEIVED_PAYMENT_METHOD_LABELS[body.method],
      amountCents: body.amountCents as number,
      receivedAt,
      recordedBy: actorUid,
      ...(reference ? { reference } : {}),
      ...(typeof body.note === "string" && body.note.trim()
        ? { note: body.note.trim() }
        : {}),
    });
  }

  if (!nextPayment) {
    return { ok: false, status: 400, error: "Impossible d'enregistrer le paiement" };
  }

  await docRef.set(
    {
      ...paymentToFirestoreUpdate(nextPayment),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  logAuditAction(AUDIT_ACTIONS.CLUB_REGISTRATION_PAYMENT_CONFIRMED, actorUid, {
    resource: "clubRegistration",
    resourceId: registrationId,
    details: {
      scope: "license_validation_payment",
      mode: body.mode ?? "manual",
      overpayment: wouldCreateOverpayment(
        payment.remainingAmountCents,
        body.amountCents as number
      ),
    },
    success: true,
  });

  await syncRosterAfterRegistrationChange(db, registrationId);

  return { ok: true };
}

export async function receiveLicenseValidationPaymentFromRequest(
  req: Request,
  db: Firestore,
  registrationId: string,
  actorUid: string
) {
  if (!validateOrigin(req)) {
    return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
  }

  const body = ((await req.json().catch(() => ({}))) ??
    {}) as ReceiveLicenseValidationPaymentInput;
  const result = await receiveLicenseValidationPayment(db, registrationId, actorUid, body);
  if (!result.ok) {
    return jsonNoStore(
      { error: result.error, ...(result.code ? { code: result.code } : {}) },
      { status: result.status }
    );
  }
  return jsonNoStore({ success: true });
}
