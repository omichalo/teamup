import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { normalizeRegistrationPayment } from "@/lib/club-registration/payment/normalize-payment";
import type { RegistrationPayment } from "@/lib/club-registration/payment/types";
import {
  paymentWriteWithSettlement,
  type PaymentSettlementWriteOptions,
} from "@/lib/club-registration/payment/settlement-firestore";
import { assignMissingActiveReceiptNumbersInTransaction } from "./assign-receipt-numbers-in-transaction";

const REGISTRATIONS_COLLECTION = "clubRegistrations";

export type CommitRegistrationPaymentMutationResult =
  | RegistrationPayment
  | null
  | { error: string; status?: 400 | 404 | 409; code?: string };

export type CommitRegistrationPaymentResult =
  | {
      ok: true;
      payment: RegistrationPayment;
      assignedReceiptCount: number;
      data: Record<string, unknown>;
    }
  | { ok: false; status: 404 | 400 | 409; error: string; code?: string };

/**
 * Applique une mutation de paiement et attribue les REC manquants
 * dans la même transaction Firestore (anti course avec annulation / double saisie).
 */
export async function commitRegistrationPaymentMutation(params: {
  db: Firestore;
  registrationId: string;
  mutate: (
    payment: RegistrationPayment,
    data: Record<string, unknown>
  ) => CommitRegistrationPaymentMutationResult;
  settlementOptions?: (
    data: Record<string, unknown>
  ) => PaymentSettlementWriteOptions | undefined;
  extraFields?: Record<string, unknown>;
}): Promise<CommitRegistrationPaymentResult> {
  const registrationRef = params.db
    .collection(REGISTRATIONS_COLLECTION)
    .doc(params.registrationId);

  return params.db.runTransaction(async (tx) => {
    const snap = await tx.get(registrationRef);
    if (!snap.exists) {
      return { ok: false, status: 404 as const, error: "Dossier introuvable" };
    }

    const data = (snap.data() ?? {}) as Record<string, unknown>;
    const payment = normalizeRegistrationPayment(data);
    if (!payment) {
      return {
        ok: false,
        status: 400 as const,
        error: "Aucune donnée de paiement sur ce dossier",
      };
    }

    const mutated = params.mutate(payment, data);
    if (mutated == null) {
      return { ok: false, status: 400 as const, error: "Mutation de paiement impossible" };
    }
    if ("error" in mutated) {
      return {
        ok: false,
        status: (mutated.status ?? 400) as 400 | 404 | 409,
        error: mutated.error,
        ...(mutated.code ? { code: mutated.code } : {}),
      };
    }

    const assigned = await assignMissingActiveReceiptNumbersInTransaction({
      tx,
      db: params.db,
      payment: mutated,
      registrationData: data,
    });

    const settlement = params.settlementOptions?.(data);
    tx.set(
      registrationRef,
      {
        ...paymentWriteWithSettlement(assigned.payment, settlement),
        ...(params.extraFields ?? {}),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return {
      ok: true as const,
      payment: assigned.payment,
      assignedReceiptCount: assigned.assignedCount,
      data,
    };
  });
}
