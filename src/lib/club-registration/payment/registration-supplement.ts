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

/** True seulement si le ledger est réellement soldé (pas de `paid` avec reliquat). */
export function shouldMarkRegistrationPaid(
  payment: Pick<RegistrationPayment, "remainingAmountCents" | "paymentStatus">
): boolean {
  return payment.remainingAmountCents === 0 && payment.paymentStatus === "paid";
}

/**
 * Champs purs pour rouvrir un dossier avec solde dû.
 * `paidAt: null` → converti en `FieldValue.delete()` par les scripts Admin.
 */
export function buildReopenForOutstandingBalanceFields(): {
  status: "payment_requested";
  paidAt: null;
} {
  return {
    status: "payment_requested",
    paidAt: null,
  };
}
