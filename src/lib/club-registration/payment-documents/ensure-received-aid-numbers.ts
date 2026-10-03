import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import {
  normalizeRegistrationPayment,
  paymentToFirestoreUpdate,
} from "@/lib/club-registration/payment/normalize-payment";
import type { PaymentAid, RegistrationPayment } from "@/lib/club-registration/payment/types";
import {
  allocateAccountingDocumentNumberInTransaction,
  resolveAccountingSeasonKey,
} from "./allocate-sequence";
import {
  hasAidDocumentNumber,
  isReceivedCollectableAid,
} from "./aid-document-helpers";

export { hasAidDocumentNumber, isReceivedCollectableAid } from "./aid-document-helpers";

const REGISTRATIONS_COLLECTION = "clubRegistrations";

/**
 * Attribue un n° AID à chaque aide collectable reçue sans numéro.
 * Persiste à la fois dans `payment.aids` et `paymentAids` (miroir top-level).
 */
export async function ensureReceivedAidDocumentNumbers(params: {
  db: Firestore;
  registrationId: string;
  data: Record<string, unknown>;
}): Promise<{
  payment: RegistrationPayment | null;
  paymentAids: PaymentAid[] | null;
  assignedCount: number;
  numbers: string[];
}> {
  const payment = normalizeRegistrationPayment(params.data);
  const topLevelAids = Array.isArray(params.data.paymentAids)
    ? (params.data.paymentAids as PaymentAid[])
    : null;
  const sourceAids = payment?.aids?.length
    ? payment.aids
    : topLevelAids ?? [];

  const needsAssignment = sourceAids.some(
    (aid) => isReceivedCollectableAid(aid) && !hasAidDocumentNumber(aid)
  );
  if (!needsAssignment) {
    return {
      payment,
      paymentAids: topLevelAids,
      assignedCount: 0,
      numbers: sourceAids
        .filter(hasAidDocumentNumber)
        .map((aid) => aid.documentNumber!.trim()),
    };
  }

  const seasonKey = resolveAccountingSeasonKey(params.data);
  const registrationRef = params.db
    .collection(REGISTRATIONS_COLLECTION)
    .doc(params.registrationId);

  return params.db.runTransaction(async (tx) => {
    const snap = await tx.get(registrationRef);
    const liveData = (snap.data() ?? {}) as Record<string, unknown>;
    const livePayment = normalizeRegistrationPayment(liveData);
    const liveTopAids = Array.isArray(liveData.paymentAids)
      ? (liveData.paymentAids as PaymentAid[])
      : null;
    const liveAids = livePayment?.aids?.length
      ? livePayment.aids
      : liveTopAids ?? [];

    const stillNeeds = liveAids.some(
      (aid) => isReceivedCollectableAid(aid) && !hasAidDocumentNumber(aid)
    );
    if (!stillNeeds) {
      return {
        payment: livePayment,
        paymentAids: liveTopAids,
        assignedCount: 0,
        numbers: liveAids
          .filter(hasAidDocumentNumber)
          .map((aid) => aid.documentNumber!.trim()),
      };
    }

    let assignedCount = 0;
    const stamped: PaymentAid[] = [];
    for (const aid of liveAids) {
      if (!isReceivedCollectableAid(aid) || hasAidDocumentNumber(aid)) {
        stamped.push(aid);
        continue;
      }
      const documentNumber = await allocateAccountingDocumentNumberInTransaction({
        tx,
        db: params.db,
        seasonKey,
        prefix: "AID",
      });
      assignedCount += 1;
      stamped.push({ ...aid, documentNumber });
    }

    const patch: Record<string, unknown> = {
      paymentAids: stamped,
      updatedAt: FieldValue.serverTimestamp(),
    };

    let nextPayment: RegistrationPayment | null = livePayment;
    if (livePayment) {
      nextPayment = { ...livePayment, aids: stamped };
      Object.assign(patch, paymentToFirestoreUpdate(nextPayment));
    }

    tx.set(registrationRef, patch, { merge: true });

    return {
      payment: nextPayment,
      paymentAids: stamped,
      assignedCount,
      numbers: stamped
        .filter(hasAidDocumentNumber)
        .map((aid) => aid.documentNumber!.trim()),
    };
  });
}
