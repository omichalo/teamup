import type { RegistrationPayment } from "./types";
import type {
  ExpectedPaymentStatusId,
  PaymentMethodId,
  PaymentStatusId,
  ReceivedPaymentMethodId,
  RemainingPaymentMethodId,
} from "../payment-constants";
import {
  PAYMENT_METHOD_IDS,
  PAYMENT_STATUS_IDS,
  RECEIVED_PAYMENT_METHOD_IDS,
  REMAINING_PAYMENT_METHOD_IDS,
} from "../payment-constants";
import { calculatePaymentSummary } from "./calculate-payment-summary";

function isPaymentMethodId(value: unknown): value is PaymentMethodId {
  return (
    typeof value === "string" &&
    (PAYMENT_METHOD_IDS as readonly string[]).includes(value)
  );
}

function isPaymentStatusId(value: unknown): value is PaymentStatusId {
  return (
    typeof value === "string" &&
    (PAYMENT_STATUS_IDS as readonly string[]).includes(value)
  );
}

function isReceivedMethodId(value: unknown): value is ReceivedPaymentMethodId {
  return (
    typeof value === "string" &&
    (RECEIVED_PAYMENT_METHOD_IDS as readonly string[]).includes(value)
  );
}

function isRemainingMethodId(value: unknown): value is RemainingPaymentMethodId {
  return (
    typeof value === "string" &&
    (REMAINING_PAYMENT_METHOD_IDS as readonly string[]).includes(value)
  );
}

function parsePaymentObject(raw: unknown): RegistrationPayment | null {
  if (typeof raw !== "object" || raw === null) return null;
  const p = raw as Record<string, unknown>;

  if (!isPaymentMethodId(p.paymentMethod)) return null;

  const totalAmountCents =
    typeof p.totalAmountCents === "number" ? p.totalAmountCents : 0;
  const aids = Array.isArray(p.aids)
    ? (p.aids as RegistrationPayment["aids"])
    : [];
  const receivedPayments = Array.isArray(p.receivedPayments)
    ? (p.receivedPayments as RegistrationPayment["receivedPayments"])
    : [];
  const expectedPayments = Array.isArray(p.expectedPayments)
    ? (p.expectedPayments as RegistrationPayment["expectedPayments"])
    : [];

  const summary = calculatePaymentSummary({
    totalAmountCents,
    aids,
    receivedPayments,
    ...(isPaymentStatusId(p.paymentStatus)
      ? { currentPaymentStatus: p.paymentStatus }
      : {}),
    preserveManualFollowUp: true,
  });

  const payment: RegistrationPayment = {
    totalAmountCents,
    assistanceTotalAmountCents:
      typeof p.assistanceTotalAmountCents === "number"
        ? p.assistanceTotalAmountCents
        : summary.assistanceTotalAmountCents,
    amountToPayCents:
      typeof p.amountToPayCents === "number"
        ? p.amountToPayCents
        : summary.amountToPayCents,
    aids,
    paymentMethod: p.paymentMethod,
    paymentInstallments:
      typeof p.paymentInstallments === "number" ? p.paymentInstallments : 1,
    expectedPayments,
    receivedPayments,
    paidAmountCents:
      typeof p.paidAmountCents === "number"
        ? p.paidAmountCents
        : summary.paidAmountCents,
    remainingAmountCents:
      typeof p.remainingAmountCents === "number"
        ? p.remainingAmountCents
        : summary.remainingAmountCents,
    paymentStatus: isPaymentStatusId(p.paymentStatus)
      ? p.paymentStatus
      : summary.paymentStatus,
  };

  if (typeof p.holidayVoucherAmountCents === "number") {
    payment.holidayVoucherAmountCents = p.holidayVoucherAmountCents;
  }
  if (isRemainingMethodId(p.remainingPaymentMethod)) {
    payment.remainingPaymentMethod = p.remainingPaymentMethod;
  }
  if (typeof p.paymentNote === "string" && p.paymentNote) {
    payment.paymentNote = p.paymentNote;
  }
  if (typeof p.specialPaymentNote === "string" && p.specialPaymentNote) {
    payment.specialPaymentNote = p.specialPaymentNote;
  }
  if (typeof p.stripePaymentUrl === "string" && p.stripePaymentUrl) {
    payment.stripePaymentUrl = p.stripePaymentUrl;
  }
  if (typeof p.stripePaymentIntentId === "string" && p.stripePaymentIntentId) {
    payment.stripePaymentIntentId = p.stripePaymentIntentId;
  }
  if (typeof p.stripeInvoiceId === "string" && p.stripeInvoiceId) {
    payment.stripeInvoiceId = p.stripeInvoiceId;
  }

  return payment;
}

/** Lit `payment` depuis un document Firestore avec repli sur les champs plats legacy. */
export function normalizeRegistrationPayment(
  data: Record<string, unknown>
): RegistrationPayment | null {
  const nested = parsePaymentObject(data.payment);
  if (nested) return nested;

  const paymentAmountCents =
    typeof data.paymentAmountCents === "number" ? data.paymentAmountCents : null;
  const pricingQuote = data.pricingQuote;
  const totalFromQuote =
    typeof pricingQuote === "object" &&
    pricingQuote !== null &&
    "totalCents" in pricingQuote &&
    typeof (pricingQuote as { totalCents: unknown }).totalCents === "number"
      ? (pricingQuote as { totalCents: number }).totalCents
      : null;

  const totalAmountCents = totalFromQuote ?? paymentAmountCents ?? 0;
  if (totalAmountCents <= 0 && paymentAmountCents === null) {
    return null;
  }

  const legacyStatus = typeof data.paymentStatus === "string" ? data.paymentStatus : "";
  let paymentStatus: PaymentStatusId = "pending_validation";
  if (legacyStatus === "paid" || legacyStatus === "complete") {
    paymentStatus = "paid";
  } else if (legacyStatus === "pending") {
    paymentStatus = "waiting_payment";
  }

  const amountToPayCents = paymentAmountCents ?? totalAmountCents;
  const paidAmountCents =
    paymentStatus === "paid" ? amountToPayCents : 0;

  const legacy: RegistrationPayment = {
    totalAmountCents,
    assistanceTotalAmountCents: Math.max(0, totalAmountCents - amountToPayCents),
    amountToPayCents,
    aids: [],
    paymentMethod: "card",
    paymentInstallments: 1,
    expectedPayments: [],
    receivedPayments: [],
    paidAmountCents,
    remainingAmountCents: Math.max(0, amountToPayCents - paidAmountCents),
    paymentStatus,
  };

  if (typeof data.stripeCheckoutUrl === "string" && data.stripeCheckoutUrl) {
    legacy.stripePaymentUrl = data.stripeCheckoutUrl;
  }
  if (typeof data.stripeInvoiceId === "string" && data.stripeInvoiceId) {
    legacy.stripeInvoiceId = data.stripeInvoiceId;
  }

  return legacy;
}

export function paymentToFirestoreUpdate(
  payment: RegistrationPayment
): Record<string, unknown> {
  return {
    payment,
    paymentAmountCents: payment.amountToPayCents,
    paymentStatus:
      payment.paymentStatus === "paid"
        ? "paid"
        : payment.paymentStatus === "waiting_payment" ||
            payment.paymentStatus === "partially_paid"
          ? "pending"
          : payment.paymentStatus,
  };
}

export function isExpectedPaymentStatusId(
  value: unknown
): value is ExpectedPaymentStatusId {
  return value === "expected" || value === "received" || value === "cancelled";
}

export function isReceivedMethodIdSafe(
  value: unknown
): value is ReceivedPaymentMethodId {
  return isReceivedMethodId(value);
}
