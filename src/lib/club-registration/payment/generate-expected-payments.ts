import { MAX_PAYMENT_INSTALLMENTS } from "../payment-constants";
import type { ExpectedPayment } from "./types";
import type { PaymentMethodId } from "../payment-constants";

export type GenerateExpectedPaymentsInput = {
  amountToPayCents: number;
  paymentMethod: PaymentMethodId;
  paymentInstallments: number;
};

function installmentLabelPrefix(paymentMethod: PaymentMethodId): string {
  switch (paymentMethod) {
    case "card":
      return "CB";
    case "cheque":
      return "Chèque";
    default:
      return "Paiement";
  }
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `ep_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Répartit le montant à payer en échéances (centimes, arrondi sur la dernière).
 */
export function splitAmountAcrossInstallments(
  amountCents: number,
  installments: number
): number[] {
  const safeAmount = Math.max(0, amountCents);
  const count = Math.min(
    MAX_PAYMENT_INSTALLMENTS,
    Math.max(1, Math.floor(installments))
  );

  if (safeAmount === 0 || count === 1) {
    return [safeAmount];
  }

  const base = Math.floor(safeAmount / count);
  const amounts = Array.from({ length: count }, () => base);
  const remainder = safeAmount - base * count;
  amounts[amounts.length - 1] += remainder;
  return amounts;
}

/**
 * Génère les lignes de paiements attendus pour CB ou chèque en plusieurs fois.
 */
export function generateExpectedPayments(
  input: GenerateExpectedPaymentsInput
): ExpectedPayment[] {
  const { amountToPayCents, paymentMethod, paymentInstallments } = input;

  if (paymentMethod !== "card" && paymentMethod !== "cheque") {
    return [];
  }

  if (amountToPayCents <= 0) {
    return [];
  }

  const installments = Math.min(
    MAX_PAYMENT_INSTALLMENTS,
    Math.max(1, paymentInstallments)
  );
  const amounts = splitAmountAcrossInstallments(amountToPayCents, installments);
  const prefix = installmentLabelPrefix(paymentMethod);
  const method = paymentMethod === "card" ? "card" : "cheque";

  return amounts.map((expectedAmountCents, index) => ({
    id: createId(),
    method,
    label: `${prefix} ${index + 1}/${amounts.length}`,
    expectedAmountCents,
    status: "expected" as const,
  }));
}
