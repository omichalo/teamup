import {
  normalizeRegistrationPayment,
  paymentToFirestoreUpdate,
} from "./normalize-payment";
import { isRegistrationSupplementDue } from "./registration-supplement";
import {
  recalculateRegistrationPayment,
  regenerateExpectedPayments,
} from "./payment-mutations";
import { buildReopenForOutstandingBalanceFirestorePatch } from "./settlement-firestore";
import type { RegistrationPayment } from "./types";

/**
 * Aligne le paiement stocké sur un nouveau total devis (ex. option ajoutée après coup).
 * Ne touche pas aux chèques vacances déclarés ni aux encaissements déjà notés.
 */
export function syncPaymentAfterQuoteChange(
  payment: RegistrationPayment,
  invoiceTotalCents: number
): RegistrationPayment {
  let next = recalculateRegistrationPayment(
    { ...payment, totalAmountCents: Math.max(0, invoiceTotalCents) },
    { preserveManualFollowUp: true }
  );

  const hasReceivedExpected = next.expectedPayments.some((line) => line.status === "received");
  if (!hasReceivedExpected && (next.paymentMethod === "cheque" || next.paymentMethod === "card")) {
    next = regenerateExpectedPayments(next);
  }

  return next;
}

function paymentNeedsQuoteSync(
  current: RegistrationPayment,
  next: RegistrationPayment
): boolean {
  return (
    current.totalAmountCents !== next.totalAmountCents ||
    current.amountToPayCents !== next.amountToPayCents ||
    current.remainingAmountCents !== next.remainingAmountCents
  );
}

function shouldReopenAfterQuoteSync(
  currentData: Record<string, unknown>,
  next: RegistrationPayment
): boolean {
  if (next.remainingAmountCents <= 0) {
    return false;
  }
  if (isRegistrationSupplementDue(next)) {
    return true;
  }
  const status = currentData.status;
  return status === "paid" || status === "approved" || currentData.paidAt != null;
}

/** Patch Firestore `payment` + champs plats, ou `{}` si déjà aligné. */
export function buildPaymentSyncPatchForQuote(params: {
  currentData: Record<string, unknown>;
  invoiceTotalCents: number;
}): Record<string, unknown> {
  const payment = normalizeRegistrationPayment(params.currentData);
  if (!payment || params.invoiceTotalCents <= 0) {
    return {};
  }

  const next = syncPaymentAfterQuoteChange(payment, params.invoiceTotalCents);
  if (!paymentNeedsQuoteSync(payment, next)) {
    return {};
  }

  const patch = paymentToFirestoreUpdate(next);

  if (shouldReopenAfterQuoteSync(params.currentData, next)) {
    Object.assign(
      patch,
      buildReopenForOutstandingBalanceFirestorePatch({
        withSupplementRequestedAt: true,
      })
    );
  }

  return patch;
}
