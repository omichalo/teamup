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
import type { ReceivedPaymentMethodId } from "@/lib/club-registration/payment-constants";
import { normalizePaymentReference } from "@/lib/club-registration/payment/payment-reference";

const ALLOWED_METHODS = new Set<ReceivedPaymentMethodId>([
  "cheque",
  "holiday_vouchers",
]);

export type ReceiveLicenseValidationPaymentInput = {
  mode?: "expected" | "manual";
  expectedId?: string;
  method?: string;
  label?: string;
  amountCents?: number;
  receivedAt?: string;
  note?: string;
  reference?: string;
};

export type ReceiveLicenseValidationPaymentResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

function isAllowedMethod(method: string): method is ReceivedPaymentMethodId {
  return ALLOWED_METHODS.has(method as ReceivedPaymentMethodId);
}

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
        error: "Seuls les chèques et chèques vacances sont autorisés",
      };
    }
    if (!Number.isInteger(body.amountCents) || (body.amountCents as number) <= 0) {
      return { ok: false, status: 400, error: "Montant invalide" };
    }
    nextPayment = addManualReceivedPayment(payment, {
      method: body.method,
      label: body.label ?? "",
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
    details: { scope: "license_validation_payment" },
    success: true,
  });

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

  const body = ((await req.json().catch(() => ({}))) ?? {}) as ReceiveLicenseValidationPaymentInput;
  const result = await receiveLicenseValidationPayment(db, registrationId, actorUid, body);
  if (!result.ok) {
    return jsonNoStore({ error: result.error }, { status: result.status });
  }
  return jsonNoStore({ success: true });
}
