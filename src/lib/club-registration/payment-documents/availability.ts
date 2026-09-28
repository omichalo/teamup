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

/**
 * Facture TeamUp : dès qu'un détail tarifaire existe et qu'un paiement
 * est engagé (soldé, partiel, ou facture Stripe déjà liée).
 */
export function isInvoiceDocumentAvailable(data: Record<string, unknown>): boolean {
  if (!canBuildInvoiceDocument(data)) {
    return false;
  }
  return (
    hasStripeInvoiceId(data) ||
    isRegistrationPaidRecord(data) ||
    hasActiveReceivedPayments(data)
  );
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
