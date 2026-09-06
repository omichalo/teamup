import { normalizeRegistrationPayment, paymentToFirestoreUpdate } from "./payment/normalize-payment";
import { markPaymentFullyPaid } from "./payment/payment-mutations";
import { receivedMethodFromPlanned } from "./payment/received-method-from-planned";
import { isRegistrationSupplementDue } from "./payment/registration-supplement";

type RegistrationPaymentRepairRecord = Record<string, unknown>;

function isRegistrationSettled(data: RegistrationPaymentRepairRecord): boolean {
  return data.status === "paid" || data.paidAt != null;
}

function storedPaymentStatusIsPaid(paymentStatus: unknown): boolean {
  return paymentStatus === "paid" || paymentStatus === "complete";
}

const TERMINAL_NON_PAID_STATUSES = new Set(["rejected", "cancelled"]);

export type RegistrationPaymentRepairKind =
  | "legacy_payment_status"
  | "supplement_reopen"
  | "settlement_finalize";

/**
 * Dossier réglé (paidAt ou status paid) mais paymentStatus Firestore racine pas aligné.
 * Ignore les dossiers avec reliquat (complément dû) — ne pas les forcer en « paid ».
 */
export function needsRegistrationPaymentStatusRepair(
  data: RegistrationPaymentRepairRecord
): boolean {
  if (!isRegistrationSettled(data)) {
    return false;
  }
  if (storedPaymentStatusIsPaid(data.paymentStatus)) {
    return false;
  }
  const payment = normalizeRegistrationPayment(data);
  if (payment && (payment.remainingAmountCents > 0 || isRegistrationSupplementDue(payment))) {
    return false;
  }
  return true;
}

/** Dossier clos (`paid`/`approved`) avec reliquat — doit être rouvert pour le complément. */
export function needsRegistrationSupplementReopenRepair(
  data: RegistrationPaymentRepairRecord
): boolean {
  const payment = normalizeRegistrationPayment(data);
  if (!payment || !isRegistrationSupplementDue(payment)) {
    return false;
  }
  const status = data.status;
  return status === "paid" || status === "approved";
}

/**
 * Paiement soldé (`remainingAmountCents === 0` + `paymentStatus === paid`)
 * mais dossier pas encore passé en `paid` / sans `paidAt`
 * (ex. encaissement via validations-licence avant alignement settlement).
 */
export function needsRegistrationSettlementFinalizeRepair(
  data: RegistrationPaymentRepairRecord
): boolean {
  if (isRegistrationSettled(data)) {
    return false;
  }
  const status = data.status;
  if (typeof status === "string" && TERMINAL_NON_PAID_STATUSES.has(status)) {
    return false;
  }
  const payment = normalizeRegistrationPayment(data);
  if (!payment) {
    return false;
  }
  return payment.remainingAmountCents === 0 && payment.paymentStatus === "paid";
}

export function detectRegistrationPaymentRepairKind(
  data: RegistrationPaymentRepairRecord
): RegistrationPaymentRepairKind | null {
  if (needsRegistrationSupplementReopenRepair(data)) {
    return "supplement_reopen";
  }
  if (needsRegistrationSettlementFinalizeRepair(data)) {
    return "settlement_finalize";
  }
  if (needsRegistrationPaymentStatusRepair(data)) {
    return "legacy_payment_status";
  }
  return null;
}

export function buildLegacyPaymentStatusRepairPatch(
  data: RegistrationPaymentRepairRecord
): Record<string, unknown> {
  const payment = normalizeRegistrationPayment(data);
  const nextPayment = payment
    ? markPaymentFullyPaid(payment, {
        method: receivedMethodFromPlanned(payment.paymentMethod),
        recordedBy: "repair-script",
        note: "Réparation de statut — moyen repris du mode prévu",
      })
    : null;

  return {
    status: "paid",
    ...(nextPayment ? paymentToFirestoreUpdate(nextPayment) : { paymentStatus: "paid" }),
  };
}

export function buildSupplementReopenRepairPatch(): Record<string, unknown> {
  return {
    status: "payment_requested",
  };
}

export function buildSettlementFinalizeRepairPatch(
  data: RegistrationPaymentRepairRecord
): Record<string, unknown> {
  const payment = normalizeRegistrationPayment(data);
  return {
    status: "paid",
    paidAt: new Date().toISOString(),
    ...(payment ? paymentToFirestoreUpdate(payment) : { paymentStatus: "paid" }),
  };
}

export function buildRegistrationPaymentRepairPatch(
  data: RegistrationPaymentRepairRecord,
  kind: RegistrationPaymentRepairKind
): Record<string, unknown> {
  if (kind === "supplement_reopen") {
    return buildSupplementReopenRepairPatch();
  }
  if (kind === "settlement_finalize") {
    return buildSettlementFinalizeRepairPatch(data);
  }
  return buildLegacyPaymentStatusRepairPatch(data);
}
