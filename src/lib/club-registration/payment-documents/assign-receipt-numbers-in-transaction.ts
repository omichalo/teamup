import type { Firestore, Transaction } from "firebase-admin/firestore";
import type { RegistrationPayment } from "@/lib/club-registration/payment/types";
import { allocateAccountingDocumentNumbersInTransaction } from "./allocate-sequence";
import { resolveAccountingSeasonKey } from "./allocate-sequence";
import {
  hasReceivedPaymentDocumentNumber,
  isActiveReceivedPayment,
} from "./received-payment-document-helpers";

/**
 * Attribue un REC à chaque encaissement actif sans numéro, dans une transaction ouverte.
 * Réutilise `teamupReceiptNumber` legacy pour la 1ʳᵉ ligne si présent.
 */
export async function assignMissingActiveReceiptNumbersInTransaction(params: {
  tx: Transaction;
  db: Firestore;
  payment: RegistrationPayment;
  registrationData: Record<string, unknown>;
}): Promise<{
  payment: RegistrationPayment;
  assignedCount: number;
  numbers: string[];
}> {
  const seasonKey = resolveAccountingSeasonKey(params.registrationData);
  const legacyDossierReceipt =
    typeof params.registrationData.teamupReceiptNumber === "string" &&
    params.registrationData.teamupReceiptNumber.trim()
      ? params.registrationData.teamupReceiptNumber.trim()
      : null;

  const missingIndexes: number[] = [];
  params.payment.receivedPayments.forEach((line, index) => {
    if (isActiveReceivedPayment(line) && !hasReceivedPaymentDocumentNumber(line)) {
      missingIndexes.push(index);
    }
  });

  if (missingIndexes.length === 0) {
    return {
      payment: params.payment,
      assignedCount: 0,
      numbers: params.payment.receivedPayments
        .filter(hasReceivedPaymentDocumentNumber)
        .map((line) => line.documentNumber!.trim()),
    };
  }

  const allocateCount =
    legacyDossierReceipt && missingIndexes.length > 0
      ? missingIndexes.length - 1
      : missingIndexes.length;

  const allocated =
    allocateCount > 0
      ? await allocateAccountingDocumentNumbersInTransaction({
          tx: params.tx,
          db: params.db,
          seasonKey,
          prefix: "REC",
          count: allocateCount,
        })
      : [];

  let allocateCursor = 0;
  let reusedLegacy = false;
  const receivedPayments = params.payment.receivedPayments.map((line, index) => {
    if (!missingIndexes.includes(index)) {
      return line;
    }

    let documentNumber: string;
    if (legacyDossierReceipt && !reusedLegacy) {
      documentNumber = legacyDossierReceipt;
      reusedLegacy = true;
    } else {
      documentNumber = allocated[allocateCursor]!;
      allocateCursor += 1;
    }
    return { ...line, documentNumber };
  });

  const payment: RegistrationPayment = {
    ...params.payment,
    receivedPayments,
  };

  return {
    payment,
    assignedCount: missingIndexes.length,
    numbers: receivedPayments
      .filter(hasReceivedPaymentDocumentNumber)
      .map((line) => line.documentNumber!.trim()),
  };
}
