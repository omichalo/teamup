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

export type RegistrationPaymentRepairKind = "legacy_payment_status" | "supplement_reopen";

/**
 * Dossier réglé (paidAt ou status paid) mais paymentStatus Firestore racine pas aligné.
 */
export function needsRegistrationPaymentStatusRepair(
  data: RegistrationPaymentRepairRecord
): boolean {
  if (!isRegistrationSettled(data)) {
    return false;
  }
  return !storedPaymentStatusIsPaid(data.paymentStatus);
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

export function detectRegistrationPaymentRepairKind(
  data: RegistrationPaymentRepairRecord
): RegistrationPaymentRepairKind | null {
  if (needsRegistrationSupplementReopenRepair(data)) {
    return "supplement_reopen";
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

export function buildRegistrationPaymentRepairPatch(
  data: RegistrationPaymentRepairRecord,
  kind: RegistrationPaymentRepairKind
): Record<string, unknown> {
  if (kind === "supplement_reopen") {
    return buildSupplementReopenRepairPatch();
  }
  return buildLegacyPaymentStatusRepairPatch(data);
}
