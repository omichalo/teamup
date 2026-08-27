import { FieldValue } from "firebase-admin/firestore";
import { paymentToFirestoreUpdate } from "./normalize-payment";
import type { RegistrationPayment } from "./types";

export function shouldMarkRegistrationPaid(payment: RegistrationPayment): boolean {
  return payment.remainingAmountCents === 0 && payment.paymentStatus === "paid";
}

export type PaymentSettlementWriteOptions = {
  /** Statut dossier avant mutation (pour dé-solder après annulation d'encaissement). */
  previousRegistrationStatus?: string;
};

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

  if (
    options?.previousRegistrationStatus === "paid" &&
    !shouldMarkRegistrationPaid(payment)
  ) {
    return {
      ...base,
      status: "payment_requested",
      paidAt: FieldValue.delete(),
    };
  }

  return base;
}
