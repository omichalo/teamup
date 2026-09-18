import type { RegistrationPayment } from "./types";

type PaymentBalance = Pick<
  RegistrationPayment,
  "remainingAmountCents" | "paidAmountCents" | "paymentStatus"
>;

/** Solde encore dû (tous moyens confondus). */
export function hasRegistrationOutstandingBalance(
  payment?: Pick<RegistrationPayment, "remainingAmountCents" | "paymentStatus"> | null
): boolean {
  if (!payment) {
    return false;
  }
  if (payment.remainingAmountCents > 0) {
    return true;
  }
  return payment.paymentStatus === "partially_paid";
}

/** Complément après au moins un encaissement (ex. option ajoutée post-paiement CB). */
export function isRegistrationSupplementDue(payment?: PaymentBalance | null): boolean {
  if (!payment) {
    return false;
  }
  return payment.paidAmountCents > 0 && payment.remainingAmountCents > 0;
}
