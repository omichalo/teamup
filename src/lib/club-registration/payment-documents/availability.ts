import { hasStripeInvoiceId, isRegistrationPaidRecord } from "@/lib/club-registration/payment-proof";
import { normalizeRegistrationPayment } from "@/lib/club-registration/payment/normalize-payment";
import { getRegistrationPaymentAids } from "@/lib/club-registration/payment/aid-receipt";
import { isRegistrationCertificateAvailable } from "@/lib/club-registration/registration-certificate/availability";
import { resolveRegistrationInvoiceLines } from "./build-invoice-view-model";
import { parseAccountingInvoices } from "./accounting-invoice-parse";
import {
  hasAidDocumentNumber,
  isReceivedCollectableAid,
} from "./aid-document-helpers";
import { hasReceivedPaymentDocumentNumber } from "./received-payment-document-helpers";
import type {
  PaymentAidReceiptSummary,
  PaymentDocumentsAvailability,
  PaymentInvoiceSummary,
  PaymentReceiptSummary,
} from "./types";

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
  if (parseAccountingInvoices(data).length > 0) {
    return true;
  }
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

/** Reçus unitaires / situation : dès qu’un encaissement actif existe. */
export function isReceiptDocumentAvailable(data: Record<string, unknown>): boolean {
  if (hasActiveReceivedPayments(data)) {
    return true;
  }
  return isRegistrationPaidRecord(data);
}

export function isSituationDocumentAvailable(data: Record<string, unknown>): boolean {
  return isInvoiceDocumentAvailable(data) || isReceiptDocumentAvailable(data);
}

export function listReceiptSummaries(
  data: Record<string, unknown>
): PaymentReceiptSummary[] {
  const payment = normalizeRegistrationPayment(data);
  if (!payment) {
    return [];
  }
  return payment.receivedPayments
    .filter((line) => !line.reversedAt && line.amountCents > 0)
    .map((line) => ({
      id: line.id,
      documentNumber: hasReceivedPaymentDocumentNumber(line)
        ? line.documentNumber!.trim()
        : null,
      amountCents: line.amountCents,
      receivedAt: line.receivedAt,
      method: line.method,
      label: line.label,
    }));
}

export function listInvoiceSummaries(
  data: Record<string, unknown>
): PaymentInvoiceSummary[] {
  return parseAccountingInvoices(data).map((doc) => ({
    id: doc.id,
    kind: doc.kind,
    documentNumber: doc.documentNumber,
    label: doc.label,
    totalCents: doc.totalCents,
    issuedAt: doc.issuedAt,
  }));
}

export function listAidReceiptSummaries(
  data: Record<string, unknown>
): PaymentAidReceiptSummary[] {
  return getRegistrationPaymentAids(data)
    .filter(isReceivedCollectableAid)
    .map((aid) => ({
      type: aid.type,
      documentNumber: hasAidDocumentNumber(aid) ? aid.documentNumber!.trim() : null,
      amountCents: aid.amountCents,
      label: aid.label,
      receivedAt: aid.receivedAt ?? null,
    }));
}

export function resolvePaymentDocumentsAvailability(
  data: Record<string, unknown>
): PaymentDocumentsAvailability {
  const receiptAvailable = isReceiptDocumentAvailable(data);
  return {
    invoiceAvailable: isInvoiceDocumentAvailable(data),
    receiptAvailable,
    situationAvailable: isSituationDocumentAvailable(data),
    registrationCertificateAvailable: isRegistrationCertificateAvailable(data),
    receipts: listReceiptSummaries(data),
    invoices: listInvoiceSummaries(data),
    aidReceipts: listAidReceiptSummaries(data),
  };
}
