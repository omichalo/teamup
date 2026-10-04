import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import {
  normalizeRegistrationPayment,
  paymentToFirestoreUpdate,
} from "@/lib/club-registration/payment/normalize-payment";
import type { RegistrationPayment } from "@/lib/club-registration/payment/types";
import { assignMissingActiveReceiptNumbersInTransaction } from "./assign-receipt-numbers-in-transaction";
import {
  hasReceivedPaymentDocumentNumber,
  isActiveReceivedPayment,
} from "./received-payment-document-helpers";

export {
  hasReceivedPaymentDocumentNumber,
  isActiveReceivedPayment,
} from "./received-payment-document-helpers";

const REGISTRATIONS_COLLECTION = "clubRegistrations";

/**
 * Attribue un REC à chaque encaissement actif sans numéro.
 * Réutilise `teamupReceiptNumber` dossier (legacy) pour le 1er paiement sans n°
 * afin de préserver un numéro déjà communiqué.
 */
export async function ensureReceivedPaymentDocumentNumbers(params: {
  db: Firestore;
  registrationId: string;
  data: Record<string, unknown>;
}): Promise<{
  payment: RegistrationPayment | null;
  assignedCount: number;
  numbers: string[];
}> {
  const initial = normalizeRegistrationPayment(params.data);
  if (!initial) {
    return { payment: null, assignedCount: 0, numbers: [] };
  }

  const needsAssignment = initial.receivedPayments.some(
    (line) => isActiveReceivedPayment(line) && !hasReceivedPaymentDocumentNumber(line)
  );
  if (!needsAssignment) {
    return {
      payment: initial,
      assignedCount: 0,
      numbers: initial.receivedPayments
        .filter(hasReceivedPaymentDocumentNumber)
        .map((line) => line.documentNumber!.trim()),
    };
  }

  const registrationRef = params.db
    .collection(REGISTRATIONS_COLLECTION)
    .doc(params.registrationId);

  return params.db.runTransaction(async (tx) => {
    const registrationSnap = await tx.get(registrationRef);
    const registrationData = (registrationSnap.data() ?? {}) as Record<string, unknown>;
    const currentPayment = normalizeRegistrationPayment(registrationData);
    if (!currentPayment) {
      return { payment: null, assignedCount: 0, numbers: [] };
    }

    const assigned = await assignMissingActiveReceiptNumbersInTransaction({
      tx,
      db: params.db,
      payment: currentPayment,
      registrationData,
    });

    if (assigned.assignedCount === 0) {
      return assigned;
    }

    tx.set(
      registrationRef,
      {
        ...paymentToFirestoreUpdate(assigned.payment),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return assigned;
  });
}
