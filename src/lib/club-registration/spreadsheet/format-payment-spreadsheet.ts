import {
  PAYMENT_STATUS_LABELS,
  RECEIVED_PAYMENT_METHOD_LABELS,
  type PaymentStatusId,
  type ReceivedPaymentMethodId,
} from "@/lib/club-registration/payment-constants";
import type { RegistrationPayment } from "@/lib/club-registration/payment/types";
import type { SpreadsheetFormatContext } from "./format-context";
import { resolveSpreadsheetUserLabel } from "./format-context";

function formatEuros(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

function formatIsoDateShort(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("fr-FR");
}

/** Résumé lisible du suivi paiement (sans UID bruts). */
export function formatPaymentForSpreadsheet(
  payment: unknown,
  context: SpreadsheetFormatContext
): string {
  if (!payment || typeof payment !== "object") {
    return "";
  }

  const data = payment as RegistrationPayment;
  const parts: string[] = [];

  if (typeof data.paymentStatus === "string" && data.paymentStatus in PAYMENT_STATUS_LABELS) {
    parts.push(PAYMENT_STATUS_LABELS[data.paymentStatus as PaymentStatusId]);
  }

  if (typeof data.amountToPayCents === "number") {
    parts.push(`À payer : ${formatEuros(data.amountToPayCents)}`);
  }
  if (typeof data.paidAmountCents === "number") {
    parts.push(`Reçu : ${formatEuros(data.paidAmountCents)}`);
  }
  if (typeof data.remainingAmountCents === "number" && data.remainingAmountCents > 0) {
    parts.push(`Reste : ${formatEuros(data.remainingAmountCents)}`);
  }

  if (Array.isArray(data.receivedPayments) && data.receivedPayments.length > 0) {
    const receipts = data.receivedPayments.map((entry) => {
      const method =
        RECEIVED_PAYMENT_METHOD_LABELS[entry.method as ReceivedPaymentMethodId] ?? entry.method;
      const amount = formatEuros(entry.amountCents);
      const date =
        typeof entry.receivedAt === "string" ? formatIsoDateShort(entry.receivedAt) : "";
      const recorder = resolveSpreadsheetUserLabel(entry.recordedBy, context);
      return [method, amount, date, recorder ? `par ${recorder}` : null].filter(Boolean).join(" · ");
    });
    parts.push(`Encaissements : ${receipts.join(" | ")}`);
  }

  return parts.join(" — ");
}
