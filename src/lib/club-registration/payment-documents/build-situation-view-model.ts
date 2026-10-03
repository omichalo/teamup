import { RECEIVED_PAYMENT_METHOD_LABELS } from "@/lib/club-registration/payment-constants";
import { normalizeRegistrationPayment } from "@/lib/club-registration/payment/normalize-payment";
import { formatPersonDisplayName } from "@/lib/shared/person-name-format";
import { resolveRegistrationInvoiceLines } from "./build-invoice-view-model";
import type { PaymentSituationViewModel } from "./types";

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

/**
 * État de situation adhésion — régénérable, sans numéro de pièce comptable.
 */
export function buildPaymentSituationViewModel(
  registrationId: string,
  data: Record<string, unknown>,
  options?: { clubName?: string; now?: Date }
): PaymentSituationViewModel | null {
  const payment = normalizeRegistrationPayment(data);
  const activePayments = (payment?.receivedPayments ?? []).filter(
    (line) => !line.reversedAt && line.amountCents > 0
  );

  const isLegacyPaidWithoutLines =
    activePayments.length === 0 &&
    (data.status === "paid" ||
      data.paymentStatus === "paid" ||
      data.paymentStatus === "complete" ||
      data.paidAt != null);

  const { lines: quoteLines, totalCents: invoicedTotalCents } =
    resolveRegistrationInvoiceLines(data);

  if (
    activePayments.length === 0 &&
    !isLegacyPaidWithoutLines &&
    invoicedTotalCents <= 0 &&
    quoteLines.length === 0
  ) {
    return null;
  }

  const paidTotalCents =
    payment?.paidAmountCents ??
    activePayments.reduce((sum, line) => sum + line.amountCents, 0) ??
    (typeof data.paymentAmountCents === "number" ? data.paymentAmountCents : 0);

  const remainingCents =
    payment?.remainingAmountCents ??
    Math.max(0, invoicedTotalCents - paidTotalCents);

  const isFullySettled = remainingCents <= 0 && paidTotalCents > 0;
  const settlementLabel: PaymentSituationViewModel["settlementLabel"] =
    paidTotalCents <= 0
      ? "En attente"
      : isFullySettled
        ? "Soldé"
        : "Partiellement payé";

  const adherentName =
    formatPersonDisplayName(
      typeof data.firstName === "string" ? data.firstName : undefined,
      typeof data.lastName === "string" ? data.lastName : undefined
    ) || "Adhérent";

  const invoiceNumber =
    typeof data.teamupInvoiceNumber === "string" && data.teamupInvoiceNumber.trim()
      ? data.teamupInvoiceNumber.trim()
      : null;

  const payments =
    activePayments.length > 0
      ? activePayments.map((line) => ({
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
        }))
      : isLegacyPaidWithoutLines
        ? [
            {
              id: "legacy-paid",
              label: "Paiement enregistré",
              method: "other" as const,
              methodLabel: "Enregistré par le club",
              amountCents: paidTotalCents,
              receivedAt:
                typeof data.paidAt === "string"
                  ? data.paidAt
                  : (options?.now ?? new Date()).toISOString(),
              receivedAtLabel: formatDateLabel(
                typeof data.paidAt === "string"
                  ? data.paidAt
                  : (options?.now ?? new Date()).toISOString()
              ),
              ...(typeof data.teamupReceiptNumber === "string" &&
              data.teamupReceiptNumber.trim()
                ? { documentNumber: data.teamupReceiptNumber.trim() }
                : {}),
            },
          ]
        : [];

  return {
    registrationId,
    clubName: options?.clubName ?? "SQY Ping",
    title: "État de situation — adhésion",
    settlementLabel,
    isFullySettled,
    adherentName,
    seasonLabel: resolveSeasonLabel(data),
    issuedAtLabel: dateFormatter.format(options?.now ?? new Date()),
    invoiceNumber,
    quoteLines,
    invoicedTotalCents,
    payments,
    paidTotalCents,
    remainingCents,
  };
}
