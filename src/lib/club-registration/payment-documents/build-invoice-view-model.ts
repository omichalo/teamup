import { normalizeRegistrationPayment } from "@/lib/club-registration/payment/normalize-payment";
import { formatPersonDisplayName } from "@/lib/shared/person-name-format";
import { parseStoredPriceQuote } from "@/lib/pricing/parse-stored-quote";
import type { PaymentDocumentLine, PaymentInvoiceViewModel } from "./types";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function resolveSeasonLabel(data: Record<string, unknown>): string | null {
  if (typeof data.seasonLabel === "string" && data.seasonLabel.trim()) {
    return data.seasonLabel.trim();
  }
  if (typeof data.season === "string" && data.season.trim()) {
    return data.season.trim();
  }
  return null;
}

export function resolveRegistrationInvoiceLines(
  data: Record<string, unknown>
): { lines: PaymentDocumentLine[]; totalCents: number } {
  const quote = parseStoredPriceQuote(data.pricingQuote);
  if (quote) {
    return {
      lines: quote.lines
        .filter((line) => line.kind !== "info")
        .map((line) => ({ label: line.label, amountCents: line.amountCents })),
      totalCents: quote.totalCents,
    };
  }

  const payment = normalizeRegistrationPayment(data);
  const totalCents =
    payment && payment.amountToPayCents > 0
      ? payment.amountToPayCents
      : typeof data.paymentAmountCents === "number" && data.paymentAmountCents > 0
        ? data.paymentAmountCents
        : 0;

  if (totalCents <= 0) {
    return { lines: [], totalCents: 0 };
  }

  return {
    lines: [{ label: "Adhésion SQY Ping", amountCents: totalCents }],
    totalCents,
  };
}

/**
 * View-model facture TeamUp (détail tarifaire, sans preuve d'encaissement).
 */
export function buildPaymentInvoiceViewModel(
  registrationId: string,
  data: Record<string, unknown>,
  options: { documentNumber: string; clubName?: string; now?: Date }
): PaymentInvoiceViewModel | null {
  const { lines, totalCents } = resolveRegistrationInvoiceLines(data);
  if (totalCents <= 0 && lines.length === 0) {
    return null;
  }

  const adherentName =
    formatPersonDisplayName(
      typeof data.firstName === "string" ? data.firstName : undefined,
      typeof data.lastName === "string" ? data.lastName : undefined
    ) || "Adhérent";

  return {
    registrationId,
    documentNumber: options.documentNumber,
    clubName: options.clubName ?? "SQY Ping",
    title: "Facture",
    adherentName,
    seasonLabel: resolveSeasonLabel(data),
    issuedAtLabel: dateFormatter.format(options.now ?? new Date()),
    quoteLines: lines,
    invoicedTotalCents: totalCents,
  };
}
