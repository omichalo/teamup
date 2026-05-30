import type { PaymentAid, PaymentSummary, ReceivedPayment } from "./types";
import type { PaymentStatusId } from "../payment-constants";

export type CalculatePaymentSummaryInput = {
  totalAmountCents: number;
  aids: PaymentAid[];
  receivedPayments: ReceivedPayment[];
  currentPaymentStatus?: PaymentStatusId;
  preserveManualFollowUp?: boolean;
};

function sumAidAmounts(aids: PaymentAid[]): number {
  return aids.reduce((acc, aid) => acc + Math.max(0, aid.amountCents), 0);
}

function sumReceivedAmounts(receivedPayments: ReceivedPayment[]): number {
  return receivedPayments.reduce((acc, p) => acc + Math.max(0, p.amountCents), 0);
}

function derivePaymentStatus(
  amountToPayCents: number,
  paidAmountCents: number,
  currentPaymentStatus?: PaymentStatusId,
  preserveManualFollowUp?: boolean
): PaymentStatusId {
  if (
    preserveManualFollowUp &&
    currentPaymentStatus === "manual_follow_up"
  ) {
    return "manual_follow_up";
  }

  if (amountToPayCents <= 0) {
    return "paid";
  }

  if (paidAmountCents <= 0) {
    if (currentPaymentStatus === "pending_validation") {
      return "pending_validation";
    }
    return "waiting_payment";
  }

  if (paidAmountCents < amountToPayCents) {
    return "partially_paid";
  }

  return "paid";
}

/**
 * Calcule les totaux et le statut de paiement à partir du montant dossier,
 * des aides déclarées et des paiements reçus.
 */
export function calculatePaymentSummary(
  input: CalculatePaymentSummaryInput
): PaymentSummary {
  const totalAmountCents = Math.max(0, input.totalAmountCents);
  const assistanceTotalAmountCents = sumAidAmounts(input.aids);
  const aidsExceedTotal = assistanceTotalAmountCents > totalAmountCents;
  const amountToPayCents = Math.max(0, totalAmountCents - assistanceTotalAmountCents);
  const paidAmountCents = sumReceivedAmounts(input.receivedPayments);
  const remainingAmountCents = Math.max(0, amountToPayCents - paidAmountCents);

  const paymentStatus = derivePaymentStatus(
    amountToPayCents,
    paidAmountCents,
    input.currentPaymentStatus,
    input.preserveManualFollowUp
  );

  return {
    assistanceTotalAmountCents,
    amountToPayCents,
    paidAmountCents,
    remainingAmountCents,
    paymentStatus,
    aidsExceedTotal,
  };
}
