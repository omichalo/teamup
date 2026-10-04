import { type Firestore } from "firebase-admin/firestore";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/auth/audit-logger";
import {
  addManualReceivedPayment,
  markExpectedPaymentReceived,
} from "@/lib/club-registration/payment/payment-mutations";
import {
  RECEIVED_PAYMENT_METHOD_IDS,
  RECEIVED_PAYMENT_METHOD_LABELS,
  type ReceivedPaymentMethodId,
} from "@/lib/club-registration/payment-constants";
import { normalizePaymentReference } from "@/lib/club-registration/payment/payment-reference";
import { wouldCreateOverpayment } from "@/lib/club-registration/payment/overpayment";
import { commitRegistrationPaymentMutation } from "@/lib/club-registration/payment-documents/commit-registration-payment";
import { syncPaymentDocumentNumbersForRegistration } from "@/lib/club-registration/payment-documents/sync-document-numbers";
import { syncRosterAfterRegistrationChange } from "@/lib/championship/sync-after-registration";
import { classifyOtherReceivedMethod } from "@/lib/accounting-export/chart";

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

function resolveManualMethod(params: {
  method: ReceivedPaymentMethodId;
  label?: string | null;
  note?: string | null;
}):
  | { ok: true; method: ReceivedPaymentMethodId }
  | { ok: false; error: string } {
  if (params.method !== "other") {
    return { ok: true, method: params.method };
  }
  const classified = classifyOtherReceivedMethod({
    label: params.label ?? null,
    note: params.note ?? null,
  });
  if (classified === "non_settlement") {
    return {
      ok: false,
      error:
        "Cette ligne ressemble à une remise / trop-perçu. Utilisez la remise exceptionnelle du dossier (avoir AVO), pas un encaissement.",
    };
  }
  if (classified === "sumup" || classified === "transfer") {
    return { ok: true, method: classified };
  }
  return { ok: true, method: params.method };
}

export async function receiveLicenseValidationPayment(
  db: Firestore,
  registrationId: string,
  actorUid: string,
  body: ReceiveLicenseValidationPaymentInput
): Promise<ReceiveLicenseValidationPaymentResult> {
  const receivedAt =
    typeof body.receivedAt === "string" && body.receivedAt
      ? body.receivedAt
      : new Date().toISOString();

  const reference = normalizePaymentReference(body.reference);
  let overpayment = false;

  const committed = await commitRegistrationPaymentMutation({
    db,
    registrationId,
    mutate: (payment) => {
      if (body.mode === "expected") {
        if (!body.expectedId) {
          return { error: "Échéance de paiement requise" };
        }
        if (!Number.isInteger(body.amountCents) || (body.amountCents as number) <= 0) {
          return { error: "Montant invalide" };
        }
        overpayment = wouldCreateOverpayment(
          payment.remainingAmountCents,
          body.amountCents as number
        );
        if (overpayment && body.confirmOverpayment !== true) {
          return {
            error: "Ce montant dépasse le reste dû. Confirmez le trop-perçu.",
            status: 400 as const,
            code: "OVERPAYMENT_CONFIRMATION_REQUIRED",
          };
        }
        const next = markExpectedPaymentReceived(payment, body.expectedId, {
          amountCents: body.amountCents as number,
          receivedAt,
          recordedBy: actorUid,
          ...(reference ? { reference } : {}),
          ...(typeof body.note === "string" && body.note.trim()
            ? { note: body.note.trim() }
            : {}),
        });
        if (!next) {
          return { error: "Impossible d'enregistrer le paiement" };
        }
        return next;
      }

      if (!body.method || !isAllowedMethod(body.method)) {
        return { error: "Moyen de paiement invalide" };
      }
      if (!Number.isInteger(body.amountCents) || (body.amountCents as number) <= 0) {
        return { error: "Montant invalide" };
      }
      overpayment = wouldCreateOverpayment(
        payment.remainingAmountCents,
        body.amountCents as number
      );
      if (overpayment && body.confirmOverpayment !== true) {
        return {
          error: "Ce montant dépasse le reste dû. Confirmez le trop-perçu.",
          status: 400 as const,
          code: "OVERPAYMENT_CONFIRMATION_REQUIRED",
        };
      }

      const resolved = resolveManualMethod({
        method: body.method,
        ...(typeof body.label === "string" ? { label: body.label } : {}),
        ...(typeof body.note === "string" ? { note: body.note } : {}),
      });
      if (!resolved.ok) {
        return { error: resolved.error };
      }

      return addManualReceivedPayment(payment, {
        method: resolved.method,
        label:
          (typeof body.label === "string" && body.label.trim()) ||
          RECEIVED_PAYMENT_METHOD_LABELS[resolved.method],
        amountCents: body.amountCents as number,
        receivedAt,
        recordedBy: actorUid,
        ...(reference ? { reference } : {}),
        ...(typeof body.note === "string" && body.note.trim()
          ? { note: body.note.trim() }
          : {}),
      });
    },
  });

  if (!committed.ok) {
    return {
      ok: false,
      status: committed.status,
      error: committed.error,
      ...(committed.code ? { code: committed.code } : {}),
    };
  }

  try {
    await syncPaymentDocumentNumbersForRegistration(db, registrationId);
  } catch (numberError) {
    console.error(
      "[license-validation/receive-payment] document numbers",
      numberError
    );
  }

  logAuditAction(AUDIT_ACTIONS.CLUB_REGISTRATION_PAYMENT_CONFIRMED, actorUid, {
    resource: "clubRegistration",
    resourceId: registrationId,
    details: {
      scope: "license_validation_payment",
      mode: body.mode ?? "manual",
      overpayment,
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
