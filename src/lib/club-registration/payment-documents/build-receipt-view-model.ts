import { RECEIVED_PAYMENT_METHOD_LABELS } from "@/lib/club-registration/payment-constants";
import { normalizeRegistrationPayment } from "@/lib/club-registration/payment/normalize-payment";
import { formatPersonDisplayName } from "@/lib/shared/person-name-format";
import { resolveRegistrationInvoiceLines } from "./build-invoice-view-model";
import type {
  PaymentReceiptPaymentLine,
  PaymentReceiptViewModel,
} from "./types";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatDateLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return dateFormatter.format(date);
}

function resolveSeasonLabel(data: Record<string, unknown>): string | null {
  if (typeof data.seasonLabel === "string" && data.seasonLabel.trim()) {
    return data.seasonLabel.trim();
  }
  if (typeof data.season === "string" && data.season.trim()) {
    return data.season.trim();
  }
  return null;
}

function toPaymentLine(line: {
  id: string;
  label: string;
  method: PaymentReceiptPaymentLine["method"];
  amountCents: number;
  receivedAt: string;
  reference?: string;
  note?: string;
  documentNumber?: string;
}): PaymentReceiptPaymentLine {
  return {
    id: line.id,
    label: line.label,
    method: line.method,
    methodLabel: RECEIVED_PAYMENT_METHOD_LABELS[line.method] ?? line.method,
    amountCents: line.amountCents,
    receivedAt: line.receivedAt,
    receivedAtLabel: formatDateLabel(line.receivedAt),
    ...(line.reference ? { reference: line.reference } : {}),
    ...(line.note ? { note: line.note } : {}),
    ...(line.documentNumber ? { documentNumber: line.documentNumber } : {}),
  };
}

/**
 * View-model d'un reçu unitaire (une pièce REC pour un encaissement).
 */
export function buildUnitPaymentReceiptViewModel(
  registrationId: string,
  data: Record<string, unknown>,
  receivedPaymentId: string,
  options: { documentNumber: string; clubName?: string; now?: Date }
): PaymentReceiptViewModel | null {
  const payment = normalizeRegistrationPayment(data);
  if (!payment) {
    return null;
  }

  const line = payment.receivedPayments.find((item) => item.id === receivedPaymentId);
  if (!line || line.reversedAt || line.amountCents <= 0) {
    return null;
  }

  const { totalCents: invoicedTotalCents } = resolveRegistrationInvoiceLines(data);
  const adherentName =
    formatPersonDisplayName(
      typeof data.firstName === "string" ? data.firstName : undefined,
      typeof data.lastName === "string" ? data.lastName : undefined
    ) || "Adhérent";

  return {
    registrationId,
    receivedPaymentId: line.id,
    documentNumber: options.documentNumber,
    clubName: options.clubName ?? "SQY Ping",
    title: "Reçu de paiement — adhésion",
    adherentName,
    seasonLabel: resolveSeasonLabel(data),
    issuedAtLabel: dateFormatter.format(options.now ?? new Date()),
    payment: toPaymentLine({
      id: line.id,
      label: line.label,
      method: line.method,
      amountCents: line.amountCents,
      receivedAt: line.receivedAt,
      ...(line.reference ? { reference: line.reference } : {}),
      ...(line.note ? { note: line.note } : {}),
      documentNumber: options.documentNumber,
    }),
    invoicedTotalCents,
    paidTotalCents: payment.paidAmountCents,
    remainingCents: payment.remainingAmountCents,
  };
}

/** @deprecated Prefer buildUnitPaymentReceiptViewModel — conservé pour tests legacy. */
export function buildPaymentReceiptViewModel(
  registrationId: string,
  data: Record<string, unknown>,
  options: { documentNumber: string; clubName?: string; now?: Date }
): PaymentReceiptViewModel | null {
  const payment = normalizeRegistrationPayment(data);
  const active = (payment?.receivedPayments ?? []).find(
    (line) => !line.reversedAt && line.amountCents > 0
  );
  if (!active) {
    return null;
  }
  return buildUnitPaymentReceiptViewModel(registrationId, data, active.id, options);
}
