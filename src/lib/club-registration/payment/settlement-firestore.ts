import { FieldValue } from "firebase-admin/firestore";
import { paymentToFirestoreUpdate } from "./normalize-payment";
import { shouldMarkRegistrationPaid } from "./registration-supplement";
import type { RegistrationPayment } from "./types";

export { shouldMarkRegistrationPaid };

export type PaymentSettlementWriteOptions = {
  /** Statut dossier avant mutation (pour dé-solder après annulation d'encaissement). */
  previousRegistrationStatus?: string;
};

/**
 * Patch Firestore pour rouvrir un dossier avec solde dû et purger `paidAt`.
 * À utiliser côté Admin SDK (mutations live).
 */
export function buildReopenForOutstandingBalanceFirestorePatch(options?: {
  withSupplementRequestedAt?: boolean;
}): Record<string, unknown> {
  return {
    status: "payment_requested",
    paidAt: FieldValue.delete(),
    ...(options?.withSupplementRequestedAt
      ? { supplementRequestedAt: FieldValue.serverTimestamp() }
      : {}),
  };
}

/** Champs Firestore à merger après un encaissement (y compris soldé). */
export function paymentWriteWithSettlement(
  payment: RegistrationPayment,
  options?: PaymentSettlementWriteOptions
): Record<string, unknown> {
  const base = paymentToFirestoreUpdate(payment);

  if (shouldMarkRegistrationPaid(payment)) {
    return {
      ...base,
      status: "paid",
      paidAt: FieldValue.serverTimestamp(),
    };
  }

  // Toujours purger paidAt dès que le paiement n'est plus soldé.
  const write: Record<string, unknown> = {
    ...base,
    paidAt: FieldValue.delete(),
  };

  if (options?.previousRegistrationStatus === "paid") {
    write.status = "payment_requested";
  }

  return write;
}
