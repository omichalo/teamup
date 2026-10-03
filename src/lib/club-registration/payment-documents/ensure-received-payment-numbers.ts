import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import {
  normalizeRegistrationPayment,
  paymentToFirestoreUpdate,
} from "@/lib/club-registration/payment/normalize-payment";
import type {
  RegistrationPayment,
} from "@/lib/club-registration/payment/types";
import { formatPaymentDocumentNumber } from "./document-numbers";
import {
  hasReceivedPaymentDocumentNumber,
  isActiveReceivedPayment,
} from "./received-payment-document-helpers";

export {
  hasReceivedPaymentDocumentNumber,
  isActiveReceivedPayment,
} from "./received-payment-document-helpers";

const COUNTERS_COLLECTION = "clubPaymentDocumentCounters";
const REGISTRATIONS_COLLECTION = "clubRegistrations";

function resolveSeasonKey(data: Record<string, unknown>): string {
  if (typeof data.seasonLabel === "string" && data.seasonLabel.trim()) {
    return data.seasonLabel.trim().replace(/\s+/g, "-");
  }
  if (typeof data.season === "string" && data.season.trim()) {
    return data.season.trim().replace(/\s+/g, "-");
  }
  return String(new Date().getFullYear());
}

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

  const seasonKey = resolveSeasonKey(params.data);
  const registrationRef = params.db
    .collection(REGISTRATIONS_COLLECTION)
    .doc(params.registrationId);
  const counterRef = params.db.collection(COUNTERS_COLLECTION).doc(seasonKey);

  return params.db.runTransaction(async (tx) => {
    const registrationSnap = await tx.get(registrationRef);
    const registrationData = (registrationSnap.data() ?? {}) as Record<string, unknown>;
    const currentPayment = normalizeRegistrationPayment(registrationData);
    if (!currentPayment) {
      return { payment: null, assignedCount: 0, numbers: [] };
    }

    const stillNeeds = currentPayment.receivedPayments.some(
      (line) => isActiveReceivedPayment(line) && !hasReceivedPaymentDocumentNumber(line)
    );
    if (!stillNeeds) {
      return {
        payment: currentPayment,
        assignedCount: 0,
        numbers: currentPayment.receivedPayments
          .filter(hasReceivedPaymentDocumentNumber)
          .map((line) => line.documentNumber!.trim()),
      };
    }

    const legacyDossierReceipt =
      typeof registrationData.teamupReceiptNumber === "string" &&
      registrationData.teamupReceiptNumber.trim()
        ? registrationData.teamupReceiptNumber.trim()
        : null;

    const counterSnap = await tx.get(counterRef);
    let seq =
      typeof counterSnap.data()?.nextReceiptSeq === "number"
        ? (counterSnap.data()?.nextReceiptSeq as number)
        : 0;
    const seqBefore = seq;

    let reusedLegacy = false;
    let assignedCount = 0;

    const receivedPayments = currentPayment.receivedPayments.map((line) => {
      if (!isActiveReceivedPayment(line) || hasReceivedPaymentDocumentNumber(line)) {
        return line;
      }

      let documentNumber: string;
      if (legacyDossierReceipt && !reusedLegacy) {
        documentNumber = legacyDossierReceipt;
        reusedLegacy = true;
      } else {
        seq += 1;
        documentNumber = formatPaymentDocumentNumber("REC", seasonKey, seq);
      }
      assignedCount += 1;
      return { ...line, documentNumber };
    });

    if (seq > seqBefore) {
      tx.set(
        counterRef,
        {
          seasonKey,
          nextReceiptSeq: seq,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    const nextPayment: RegistrationPayment = {
      ...currentPayment,
      receivedPayments,
    };

    tx.set(
      registrationRef,
      {
        ...paymentToFirestoreUpdate(nextPayment),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return {
      payment: nextPayment,
      assignedCount,
      numbers: receivedPayments
        .filter(hasReceivedPaymentDocumentNumber)
        .map((line) => line.documentNumber!.trim()),
    };
  });
}
