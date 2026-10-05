import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/auth/audit-logger";
import { syncRosterAfterRegistrationChange } from "@/lib/championship/sync-after-registration";
import {
  parseAccountingInvoices,
  sumAccountingInvoicesNetCents,
} from "@/lib/club-registration/payment-documents/accounting-invoice-parse";
import { reconcileAccountingInvoicesAfterQuoteChange } from "@/lib/club-registration/payment-documents/reconcile-accounting-invoices";
import {
  normalizeRegistrationPayment,
  paymentToFirestoreUpdate,
} from "@/lib/club-registration/payment/normalize-payment";
import { cancelAllPendingExpectedPayments } from "@/lib/club-registration/payment/payment-mutations";
import { isTerminalInactiveRegistrationStatus } from "@/lib/club-registration/registration-status";
import {
  isRegistrationCancelConfirmationValid,
  normalizeCancellationReason,
} from "@/lib/club-registration/validate-registration-cancel-confirmation";

const COLLECTION = "clubRegistrations";

export const ACTIVE_RECEIPTS_CANCEL_ERROR =
  "Annulez d'abord les encaissements actifs (REC) avant d'annuler le dossier.";

export const ALREADY_CANCELLED_ERROR = "Ce dossier est déjà annulé.";

export type CancelClubRegistrationResult =
  | { ok: true }
  | { ok: false; status: 400 | 404; error: string; code?: string };

function hasActiveReceivedPayments(data: Record<string, unknown>): boolean {
  const payment = normalizeRegistrationPayment(data);
  if (!payment) return false;
  return payment.receivedPayments.some((line) => !line.reversedAt);
}

/**
 * Annule un dossier d'adhésion (statut cancelled + motif).
 * Précondition : aucun encaissement REC actif (non reverse).
 * Si une créance FAC/AVO nette subsiste → émet un AVO de clôture.
 */
export async function cancelClubRegistration(params: {
  db: Firestore;
  registrationId: string;
  actorUid: string;
  reason: unknown;
  confirmationPhrase: unknown;
}): Promise<CancelClubRegistrationResult> {
  const reason = normalizeCancellationReason(params.reason);
  if (!reason) {
    return {
      ok: false,
      status: 400,
      error: "Motif d'annulation requis (500 caractères max).",
    };
  }

  const registrationRef = params.db.collection(COLLECTION).doc(params.registrationId);
  const snap = await registrationRef.get();
  if (!snap.exists) {
    return { ok: false, status: 404, error: "Dossier introuvable" };
  }

  const data = (snap.data() ?? {}) as Record<string, unknown>;
  const firstName = typeof data.firstName === "string" ? data.firstName : "";
  const lastName = typeof data.lastName === "string" ? data.lastName : "";

  if (
    !isRegistrationCancelConfirmationValid(
      { firstName, lastName },
      params.confirmationPhrase
    )
  ) {
    return {
      ok: false,
      status: 400,
      error:
        "Confirmation invalide. Saisissez la phrase affichée, par ex. ANNULER Prénom NOM.",
    };
  }

  const currentStatus = typeof data.status === "string" ? data.status : "";
  if (isTerminalInactiveRegistrationStatus(currentStatus)) {
    return { ok: false, status: 400, error: ALREADY_CANCELLED_ERROR };
  }

  if (hasActiveReceivedPayments(data)) {
    return {
      ok: false,
      status: 400,
      error: ACTIVE_RECEIPTS_CANCEL_ERROR,
      code: "ACTIVE_RECEIPTS",
    };
  }

  const cancelNote = `Annulation dossier : ${reason}`;
  const payment = normalizeRegistrationPayment(data);
  const paymentPatch = payment
    ? paymentToFirestoreUpdate(cancelAllPendingExpectedPayments(payment, cancelNote))
    : {};

  const cancelledAt = new Date().toISOString();
  await registrationRef.set(
    {
      ...paymentPatch,
      status: "cancelled",
      cancellationReason: reason,
      cancelledAt,
      cancelledByUid: params.actorUid,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const refreshed = await registrationRef.get();
  const liveData = (refreshed.data() ?? {}) as Record<string, unknown>;
  const invoices = parseAccountingInvoices(liveData);
  const netCents = sumAccountingInvoicesNetCents(invoices);
  if (netCents > 0) {
    await reconcileAccountingInvoicesAfterQuoteChange({
      db: params.db,
      registrationId: params.registrationId,
      data: liveData,
      newInvoiceTotalCents: 0,
      reason: `Annulation dossier — ${reason}`,
    });
  }

  await syncRosterAfterRegistrationChange(params.db, params.registrationId);

  logAuditAction(AUDIT_ACTIONS.CLUB_REGISTRATION_CANCELLED, params.actorUid, {
    resource: "clubRegistration",
    resourceId: params.registrationId,
    details: {
      previousStatus: currentStatus || null,
      reason,
      accountingNetClosedCents: netCents,
    },
    success: true,
  });

  return { ok: true };
}
