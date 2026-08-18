import { FieldValue } from "firebase-admin/firestore";
import { paymentToFirestoreUpdate } from "./normalize-payment";
import type { RegistrationPayment } from "./types";

export function shouldMarkRegistrationPaid(payment: RegistrationPayment): boolean {
  return payment.remainingAmountCents === 0 && payment.paymentStatus === "paid";
}

/** Champs Firestore à merger après un encaissement (y compris soldé). */
export function paymentWriteWithSettlement(
  payment: RegistrationPayment
): Record<string, unknown> {
  return {
    ...paymentToFirestoreUpdate(payment),
    ...(shouldMarkRegistrationPaid(payment)
      ? {
          status: "paid",
          paidAt: FieldValue.serverTimestamp(),
        }
      : {}),
  };
}
