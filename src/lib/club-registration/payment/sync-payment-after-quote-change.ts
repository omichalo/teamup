import { FieldValue } from "firebase-admin/firestore";
import {
  normalizeRegistrationPayment,
  paymentToFirestoreUpdate,
} from "./normalize-payment";
import {
  isRegistrationSupplementDue,
  resolveJerseyFollowUpForSupplement,
} from "./registration-supplement";
import {
  recalculateRegistrationPayment,
  regenerateExpectedPayments,
} from "./payment-mutations";
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

  if (isRegistrationSupplementDue(next)) {
    patch.status = "payment_requested";
    patch.supplementRequestedAt = FieldValue.serverTimestamp();
    const jerseyStatus = resolveJerseyFollowUpForSupplement({
      wantsCompetitorExtras: params.currentData.wantsCompetitorExtras,
      wantsOptionalJersey: params.currentData.wantsOptionalJersey,
      currentStatus: params.currentData.jerseyFollowUpStatus,
    });
    if (jerseyStatus) {
      patch.jerseyFollowUpStatus = jerseyStatus;
    }
  }

  return patch;
}
