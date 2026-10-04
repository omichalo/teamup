import { type Firestore } from "firebase-admin/firestore";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/auth/audit-logger";
import {
  isReceivedPaymentReversible,
  reverseReceivedPayment,
} from "@/lib/club-registration/payment/payment-mutations";
import { commitRegistrationPaymentMutation } from "@/lib/club-registration/payment-documents/commit-registration-payment";
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

  let reversedAmountCents = 0;
  let reversedMethod: string | undefined;

  const committed = await commitRegistrationPaymentMutation({
    db,
    registrationId,
    mutate: (payment) => {
      const received = payment.receivedPayments.find((line) => line.id === receivedId);
      if (!received) {
        return { error: "Encaissement introuvable", status: 404 as const };
      }
      if (!isReceivedPaymentReversible(received)) {
        return {
          error: "Cet encaissement ne peut pas être annulé depuis l'application",
          status: 400 as const,
          code: "PAYMENT_NOT_REVERSIBLE",
        };
      }
      reversedAmountCents = received.amountCents;
      reversedMethod = received.method;
      const nextPayment = reverseReceivedPayment(payment, receivedId, {
        reason: trimmedReason,
        reversedBy: actorUid,
      });
      if (!nextPayment) {
        return { error: "Impossible d'annuler cet encaissement" };
      }
      return nextPayment;
    },
    settlementOptions: (data) => {
      const previousRegistrationStatus =
        typeof data.status === "string" ? data.status : undefined;
      return previousRegistrationStatus
        ? { previousRegistrationStatus }
        : undefined;
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

  logAuditAction(AUDIT_ACTIONS.CLUB_REGISTRATION_UPDATED, actorUid, {
    resource: "clubRegistration",
    resourceId: registrationId,
    details: {
      action: "payment_received_reversed",
      receivedId,
      amountCents: reversedAmountCents,
      method: reversedMethod,
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
