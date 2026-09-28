import { hasStripeInvoiceId, isRegistrationPaidRecord } from "@/lib/club-registration/payment-proof";
import { normalizeRegistrationPayment } from "@/lib/club-registration/payment/normalize-payment";
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

/** Facture téléchargeable / générable (Stripe ou dossier soldé). */
export function isInvoiceDocumentAvailable(data: Record<string, unknown>): boolean {
  return hasStripeInvoiceId(data) || isRegistrationPaidRecord(data);
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
