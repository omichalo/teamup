import { hasStripeInvoiceId, isRegistrationPaidRecord } from "@/lib/club-registration/payment-proof";
import { normalizeRegistrationPayment } from "@/lib/club-registration/payment/normalize-payment";
import { resolveRegistrationInvoiceLines } from "./build-invoice-view-model";
import type { PaymentDocumentsAvailability } from "./types";

function hasActiveReceivedPayments(data: Record<string, unknown>): boolean {
  const payment = normalizeRegistrationPayment(data);
  if (!payment) {
    return false;
  }
  return (
    payment.paidAmountCents > 0 &&
    payment.receivedPayments.some((line) => !line.reversedAt && line.amountCents > 0)
  );
}

function canBuildInvoiceDocument(data: Record<string, unknown>): boolean {
  const { totalCents, lines } = resolveRegistrationInvoiceLines(data);
  return totalCents > 0 || lines.length > 0;
}

function isPaymentPhaseStarted(data: Record<string, unknown>): boolean {
  if (
    data.status === "payment_requested" ||
    data.status === "paid" ||
    isRegistrationPaidRecord(data) ||
    hasStripeInvoiceId(data) ||
    hasActiveReceivedPayments(data)
  ) {
    return true;
  }

  const paymentStatus =
    typeof data.paymentStatus === "string" ? data.paymentStatus : null;
  if (
    paymentStatus === "waiting_payment" ||
    paymentStatus === "partially_paid" ||
    paymentStatus === "paid" ||
    paymentStatus === "complete"
  ) {
    return true;
  }

  const payment = normalizeRegistrationPayment(data);
  if (!payment) {
    return false;
  }
  return (
    payment.paymentStatus === "waiting_payment" ||
    payment.paymentStatus === "partially_paid" ||
    payment.paymentStatus === "paid"
  );
}

/**
 * Facture TeamUp : dès qu'un détail tarifaire existe et que le paiement
 * est demandé / engagé (avant même le 1er encaissement).
 */
export function isInvoiceDocumentAvailable(data: Record<string, unknown>): boolean {
  return canBuildInvoiceDocument(data) && isPaymentPhaseStarted(data);
}

/** Reçu TeamUp : dès qu’un encaissement actif existe (y compris partiel). */
export function isReceiptDocumentAvailable(data: Record<string, unknown>): boolean {
  if (hasActiveReceivedPayments(data)) {
    return true;
  }
  // Dossiers legacy marqués payés sans objet payment détaillé.
  return isRegistrationPaidRecord(data);
}

export function resolvePaymentDocumentsAvailability(
  data: Record<string, unknown>
): PaymentDocumentsAvailability {
  return {
    invoiceAvailable: isInvoiceDocumentAvailable(data),
    receiptAvailable: isReceiptDocumentAvailable(data),
  };
}
