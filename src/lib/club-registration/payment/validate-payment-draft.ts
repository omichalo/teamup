import { MAX_PAYMENT_INSTALLMENTS, PAYMENT_METHOD_IDS } from "../payment-constants";

type DraftSlice = {
  paymentMethod: string;
  paymentInstallments: number;
  specialPaymentNote?: string | undefined;
};

export type PaymentDraftValidationIssue = {
  message: string;
  focusSelector: string;
};

export function validatePaymentDraft(
  draft: DraftSlice
): PaymentDraftValidationIssue | null {
  if (
    !draft.paymentMethod ||
    !(PAYMENT_METHOD_IDS as readonly string[]).includes(draft.paymentMethod)
  ) {
    return {
      message: "Choisissez un mode de paiement.",
      focusSelector: '[data-field="paymentMethod"]',
    };
  }

  if (draft.paymentMethod === "cheque") {
    if (
      draft.paymentInstallments < 1 ||
      draft.paymentInstallments > MAX_PAYMENT_INSTALLMENTS
    ) {
      return {
        message: `Indiquez un nombre de fois entre 1 et ${MAX_PAYMENT_INSTALLMENTS}.`,
        focusSelector: '[data-field="paymentInstallments"]',
      };
    }
  }

  if (draft.paymentMethod === "other" && !(draft.specialPaymentNote ?? "").trim()) {
    return {
      message: "Précisez votre situation pour un cas particulier.",
      focusSelector: '[data-field="specialPaymentNote"]',
    };
  }

  return null;
}
