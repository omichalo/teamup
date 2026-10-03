import type { Firestore } from "firebase-admin/firestore";
import {
  isInvoiceDocumentAvailable,
  isReceiptDocumentAvailable,
} from "@/lib/club-registration/payment-documents/availability";
import { ensurePaymentDocumentNumber } from "@/lib/club-registration/payment-documents/document-numbers";
import { ensureReceivedPaymentDocumentNumbers } from "@/lib/club-registration/payment-documents/ensure-received-payment-numbers";
import { ensureReceivedAidDocumentNumbers } from "@/lib/club-registration/payment-documents/ensure-received-aid-numbers";
import { ensureInitialAccountingInvoiceSnapshot } from "@/lib/club-registration/payment-documents/reconcile-accounting-invoices";

export type AssignedPaymentDocumentNumbers = {
  invoiceNumber: string | null;
  receiptNumbers: string[];
  aidNumbers: string[];
  assignedInvoice: boolean;
  assignedReceiptCount: number;
  assignedAidCount: number;
};

/**
 * Attribue FAC (dossier) + REC (par encaissement) + AID (aides reçues)
 * dès que les critères métier sont remplis. Idempotent.
 * Ne doit pas être appelé depuis une simple consultation de fiche.
 */
export async function assignPaymentDocumentNumbersIfEligible(params: {
  db: Firestore;
  registrationId: string;
  data: Record<string, unknown>;
}): Promise<AssignedPaymentDocumentNumbers> {
  let invoiceNumber =
    typeof params.data.teamupInvoiceNumber === "string" &&
    params.data.teamupInvoiceNumber.trim()
      ? params.data.teamupInvoiceNumber.trim()
      : null;

  let assignedInvoice = false;
  let workingData = { ...params.data };

  if (isInvoiceDocumentAvailable(workingData) && !invoiceNumber) {
    invoiceNumber = await ensurePaymentDocumentNumber({
      db: params.db,
      registrationId: params.registrationId,
      data: workingData,
      kind: "invoice",
    });
    assignedInvoice = true;
    workingData = { ...workingData, teamupInvoiceNumber: invoiceNumber };
  }

  if (invoiceNumber && isInvoiceDocumentAvailable(workingData)) {
    const invoices = await ensureInitialAccountingInvoiceSnapshot({
      db: params.db,
      registrationId: params.registrationId,
      data: workingData,
    });
    if (invoices.length > 0) {
      workingData = { ...workingData, accountingInvoices: invoices };
    }
  }

  let receiptNumbers: string[] = [];
  let assignedReceiptCount = 0;

  if (isReceiptDocumentAvailable(workingData)) {
    const receiptResult = await ensureReceivedPaymentDocumentNumbers({
      db: params.db,
      registrationId: params.registrationId,
      data: workingData,
    });
    receiptNumbers = receiptResult.numbers;
    assignedReceiptCount = receiptResult.assignedCount;
    if (receiptResult.payment) {
      workingData = { ...workingData, payment: receiptResult.payment };
    }
  }

  const aidResult = await ensureReceivedAidDocumentNumbers({
    db: params.db,
    registrationId: params.registrationId,
    data: workingData,
  });

  return {
    invoiceNumber,
    receiptNumbers,
    aidNumbers: aidResult.numbers,
    assignedInvoice,
    assignedReceiptCount,
    assignedAidCount: aidResult.assignedCount,
  };
}
