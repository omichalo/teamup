import { calculatePaymentSummary } from "./calculate-payment-summary";
import { generateExpectedPayments } from "./generate-expected-payments";
import type {
  ExpectedPayment,
  ReceivedPayment,
  RegistrationPayment,
} from "./types";
import type { PaymentStatusId } from "../payment-constants";
import type { ReceivedPaymentMethodId } from "../payment-constants";

function createReceivedId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `rp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function recalculateRegistrationPayment(
  payment: RegistrationPayment,
  options?: { preserveManualFollowUp?: boolean }
): RegistrationPayment {
  const summary = calculatePaymentSummary({
    totalAmountCents: payment.totalAmountCents,
    aids: payment.aids,
    receivedPayments: payment.receivedPayments,
    currentPaymentStatus: payment.paymentStatus,
    ...(options?.preserveManualFollowUp
      ? { preserveManualFollowUp: true }
      : {}),
  });

  return {
    ...payment,
    assistanceTotalAmountCents: summary.assistanceTotalAmountCents,
    amountToPayCents: summary.amountToPayCents,
    paidAmountCents: summary.paidAmountCents,
    remainingAmountCents: summary.remainingAmountCents,
    paymentStatus: summary.paymentStatus,
  };
}

export function regenerateExpectedPayments(
  payment: RegistrationPayment
): RegistrationPayment {
  const expectedPayments = generateExpectedPayments({
    amountToPayCents: payment.amountToPayCents,
    paymentMethod: payment.paymentMethod,
    paymentInstallments: payment.paymentInstallments,
  });
  return { ...payment, expectedPayments };
}

export function markExpectedPaymentReceived(
  payment: RegistrationPayment,
  expectedId: string,
  input: {
    amountCents: number;
    receivedAt: string;
    note?: string;
    recordedBy?: string;
  }
): RegistrationPayment | null {
  const expectedIndex = payment.expectedPayments.findIndex((e) => e.id === expectedId);
  if (expectedIndex === -1) return null;

  const expected = payment.expectedPayments[expectedIndex];
  if (expected.status === "cancelled") return null;

  const received: ReceivedPayment = {
    id: createReceivedId(),
    method: expected.method,
    label: expected.label,
    amountCents: Math.max(0, input.amountCents),
    receivedAt: input.receivedAt,
    expectedPaymentId: expected.id,
    ...(input.recordedBy ? { recordedBy: input.recordedBy } : {}),
    ...(input.note ? { note: input.note } : {}),
  };

  const expectedPayments = payment.expectedPayments.map((line, index) =>
    index === expectedIndex ? { ...line, status: "received" as const } : line
  );

  const next: RegistrationPayment = {
    ...payment,
    expectedPayments,
    receivedPayments: [...payment.receivedPayments, received],
  };

  return recalculateRegistrationPayment(next);
}

export function cancelExpectedPayment(
  payment: RegistrationPayment,
  expectedId: string,
  note?: string
): RegistrationPayment | null {
  const expectedIndex = payment.expectedPayments.findIndex((e) => e.id === expectedId);
  if (expectedIndex === -1) return null;

  const expectedPayments = payment.expectedPayments.map((line, index) => {
    if (index !== expectedIndex) return line;
    const cancelled: ExpectedPayment = { ...line, status: "cancelled" };
    if (note?.trim()) cancelled.note = note.trim();
    return cancelled;
  });

  return recalculateRegistrationPayment({ ...payment, expectedPayments });
}

export function addManualReceivedPayment(
  payment: RegistrationPayment,
  input: {
    method: ReceivedPaymentMethodId;
    label: string;
    amountCents: number;
    receivedAt: string;
    note?: string;
    recordedBy?: string;
  }
): RegistrationPayment {
  const received: ReceivedPayment = {
    id: createReceivedId(),
    method: input.method,
    label: input.label.trim() || RECEIVED_PAYMENT_METHOD_LABELS_FALLBACK(input.method),
    amountCents: Math.max(0, input.amountCents),
    receivedAt: input.receivedAt,
    ...(input.recordedBy ? { recordedBy: input.recordedBy } : {}),
    ...(input.note ? { note: input.note } : {}),
  };

  return recalculateRegistrationPayment({
    ...payment,
    receivedPayments: [...payment.receivedPayments, received],
  });
}

function RECEIVED_PAYMENT_METHOD_LABELS_FALLBACK(
  method: ReceivedPaymentMethodId
): string {
  const labels: Record<ReceivedPaymentMethodId, string> = {
    card: "Carte bancaire",
    cheque: "Chèque",
    holiday_vouchers: "Chèques vacances",
    cash: "Espèces",
    other: "Autre",
  };
  return labels[method];
}

export function markPaymentFullyPaid(
  payment: RegistrationPayment,
  input?: { note?: string; recordedBy?: string }
): RegistrationPayment {
  const remaining = payment.remainingAmountCents;
  if (remaining <= 0) {
    return recalculateRegistrationPayment({
      ...payment,
      paymentStatus: "paid",
    });
  }

  const withReceipt = addManualReceivedPayment(payment, {
    method: payment.paymentMethod === "cheque" ? "cheque" : "card",
    label: "Solde — marqué payé par le secrétariat",
    amountCents: remaining,
    receivedAt: new Date().toISOString(),
    ...(input?.note ? { note: input.note } : {}),
    ...(input?.recordedBy ? { recordedBy: input.recordedBy } : {}),
  });

  return {
    ...withReceipt,
    paymentStatus: "paid" satisfies PaymentStatusId,
    remainingAmountCents: 0,
    paidAmountCents: withReceipt.amountToPayCents,
  };
}

export function setManualFollowUp(
  payment: RegistrationPayment
): RegistrationPayment {
  return {
    ...payment,
    paymentStatus: "manual_follow_up",
  };
}

export function updateExpectedPaymentNote(
  payment: RegistrationPayment,
  expectedId: string,
  note: string
): RegistrationPayment | null {
  const expectedIndex = payment.expectedPayments.findIndex((e) => e.id === expectedId);
  if (expectedIndex === -1) return null;

  const expectedPayments = payment.expectedPayments.map((line, index) => {
    if (index !== expectedIndex) return line;
    const updated: ExpectedPayment = { ...line };
    const trimmed = note.trim();
    if (trimmed) updated.note = trimmed;
    return updated;
  });

  return { ...payment, expectedPayments };
}

export type { ExpectedPayment };
