import { getRegistrationPaymentAids } from "@/lib/club-registration/payment/aid-receipt";
import { sumExceptionalDiscountCents } from "@/lib/club-registration/payment/exceptional-discount";
import { normalizeRegistrationPayment } from "@/lib/club-registration/payment/normalize-payment";
import { isInvoiceDocumentAvailable } from "@/lib/club-registration/payment-documents/availability";
import {
  parseAccountingInvoices,
  sumAccountingInvoicesNetCents,
} from "@/lib/club-registration/payment-documents/accounting-invoice-parse";
import type { AccountingInvoiceDocument } from "@/lib/club-registration/payment-documents/accounting-invoice-types";
import { resolveRegistrationInvoiceLines } from "@/lib/club-registration/payment-documents/build-invoice-view-model";
import { resolveRegistrationDonationPricing } from "@/lib/club-registration/resolve-registration-donation";
import { parseStoredPriceQuote } from "@/lib/pricing/parse-stored-quote";
import { appendAid, appendReceipt } from "./append-settlements";
import { SAGE_ACCOUNTS, SAGE_JOURNALS } from "./chart";
import { movementsToLines } from "./entry-lines";
import {
  buildThirdPartyCode,
  compactPieceNumber,
  formatParisDate,
  readAdherentName,
  readSeasonLabel,
  readStringField,
  sageEntryLabel,
} from "./format-sage";
import type {
  RegistrationSageExport,
  SageEntryLine,
  SageExportAnomaly,
  SagePartyContext,
  SageThirdParty,
} from "./types";
import { ventilateAccountingInvoice } from "./ventilate-invoice";

function readIssuedAt(data: Record<string, unknown>): string | null {
  const value = data.paymentRequestedAt;
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

function virtualInitialInvoice(
  data: Record<string, unknown>,
  documentNumber: string
): AccountingInvoiceDocument | null {
  const { lines, totalCents } = resolveRegistrationInvoiceLines(data);
  const quote = parseStoredPriceQuote(data.pricingQuote);
  let invoiceLines = lines;
  let invoiceTotal = totalCents;
  if (quote) {
    try {
      const donation = resolveRegistrationDonationPricing(quote, data);
      if (donation.invoiceTotalCents !== totalCents) {
        invoiceTotal = donation.invoiceTotalCents;
        invoiceLines = [
          ...lines,
          ...(donation.donationDiscountCents !== 0 || donation.voluntaryDonationCents !== 0
            ? [
                {
                  label: "Ajustement don / remise",
                  amountCents: donation.invoiceTotalCents - totalCents,
                },
              ]
            : []),
        ];
      }
    } catch {
      invoiceLines = lines;
      invoiceTotal = totalCents;
    }
  }
  if (invoiceTotal <= 0 && invoiceLines.length === 0) {
    return null;
  }
  const issuedAt = readIssuedAt(data) ?? new Date(0).toISOString();
  return {
    id: `virtual:${documentNumber}`,
    kind: "invoice",
    documentNumber,
    label: "Facture d'adhésion",
    lines:
      invoiceLines.length > 0
        ? invoiceLines
        : [{ label: "Adhésion SQY Ping", amountCents: invoiceTotal }],
    totalCents: invoiceTotal,
    issuedAt,
    quoteTotalAfterCents: invoiceTotal,
  };
}

function loadInvoices(
  data: Record<string, unknown>,
  anomalies: SageExportAnomaly[],
  context: SagePartyContext
): AccountingInvoiceDocument[] {
  const existing = parseAccountingInvoices(data);
  if (existing.length > 0) {
    return existing;
  }
  const invoiceNumber =
    typeof data.teamupInvoiceNumber === "string" ? data.teamupInvoiceNumber.trim() : "";
  if (!invoiceNumber || !isInvoiceDocumentAvailable(data)) {
    return [];
  }
  const virtual = virtualInitialInvoice(data, invoiceNumber);
  if (!virtual) {
    return [];
  }
  anomalies.push({
    ...context,
    code: "snapshot_absent",
    severity: "review",
    message:
      "Numéro FAC attribué sans snapshot accountingInvoices : pièce reconstruite depuis le devis courant.",
    documentNumber: invoiceNumber,
    amountCents: virtual.totalCents,
  });
  if (!readIssuedAt(data)) {
    anomalies.push({
      ...context,
      code: "date_manquante",
      severity: "review",
      message: "Date d'engagement absente : date technique 01/01/1970 utilisée pour la FAC reconstruite.",
      documentNumber: invoiceNumber,
      amountCents: null,
    });
  }
  return [virtual];
}

export function buildSageExportForRegistration(
  registrationId: string,
  data: Record<string, unknown>
): RegistrationSageExport {
  const adherentName = readAdherentName(data);
  const seasonLabel = readSeasonLabel(data);
  const context = { registrationId, adherentName, seasonLabel };
  const anomalies: SageExportAnomaly[] = [];
  const party = buildThirdPartyCode(data, registrationId);
  const lines: SageEntryLine[] = [];

  if (party.unfrozen) {
    anomalies.push({
      ...context,
      code: "tiers_code_non_fige",
      severity: "review",
      message: `Code auxiliaire non persisté : repli temporaire ${party.code}. Relancer le backfill / sync FAC.`,
      documentNumber: "",
      amountCents: null,
    });
  }
  if (party.licenseMissing) {
    anomalies.push({
      ...context,
      code: "licence_absente",
      severity: "review",
      message: `Licence FFTT absente sur la fiche tiers (code auxiliaire ${party.code}). Attribut seulement — le code ne changera pas à l'arrivée du numéro.`,
      documentNumber: "",
      amountCents: null,
    });
  }

  const invoiceNumber =
    typeof data.teamupInvoiceNumber === "string" && data.teamupInvoiceNumber.trim()
      ? data.teamupInvoiceNumber.trim()
      : null;
  const invoices = loadInvoices(data, anomalies, context);
  pushExceptionalDiscountGap(anomalies, context, data, invoices);

  for (const doc of invoices) {
    appendInvoicePiece(lines, anomalies, context, data, doc, party.code, invoiceNumber);
  }

  const payment = normalizeRegistrationPayment(data);
  if (payment) {
    for (const received of payment.receivedPayments) {
      appendReceipt(lines, anomalies, context, received, party.code);
    }
  }

  for (const aid of getRegistrationPaymentAids(data)) {
    appendAid(lines, anomalies, context, aid, party.code);
  }

  const thirdParty: SageThirdParty | null =
    lines.length === 0
      ? null
      : {
          code: party.code,
          licenseMissing: party.licenseMissing,
          lastName: readStringField(data, "lastName"),
          firstName: readStringField(data, "firstName"),
          license: party.license,
          addressLine1: readStringField(data, "addressLine1"),
          postalCode: readStringField(data, "postalCode"),
          city: readStringField(data, "city"),
          email: readStringField(data, "adherentEmail"),
          registrationId,
          seasonLabel,
        };

  return { lines, anomalies, thirdParty };
}

function appendInvoicePiece(
  lines: SageEntryLine[],
  anomalies: SageExportAnomaly[],
  context: SagePartyContext,
  data: Record<string, unknown>,
  doc: AccountingInvoiceDocument,
  auxiliary: string,
  primaryInvoiceNumber: string | null
): void {
  if (doc.totalCents === 0) {
    return;
  }
  const date = formatParisDate(doc.issuedAt);
  if (!date) {
    anomalies.push({
      ...context,
      code: "date_manquante",
      severity: "blocking",
      message: "Date de pièce invalide : facture exclue de l'export.",
      documentNumber: doc.documentNumber,
      amountCents: doc.totalCents,
    });
    return;
  }

  const ventilation = ventilateAccountingInvoice(doc, data, primaryInvoiceNumber);
  if (ventilation.warning) {
    anomalies.push({
      ...context,
      code: ventilation.mode === "fallback" ? "ventilation_repli" : "ventilation_incertaine",
      severity: "review",
      message: ventilation.warning,
      documentNumber: doc.documentNumber,
      amountCents: doc.totalCents,
    });
  }

  const nature =
    doc.kind === "credit_note"
      ? "Avoir"
      : doc.kind === "supplement"
        ? "Facture complémentaire"
        : "Facture";
  const pieceLines = movementsToLines({
    context,
    journal: SAGE_JOURNALS.sales,
    date,
    piece: compactPieceNumber(doc.documentNumber),
    teamupDocumentNumber: doc.documentNumber,
    auxiliary,
    clientLabel: sageEntryLabel(context.adherentName, nature, context.seasonLabel),
    totalCents: doc.totalCents,
    splits: ventilation.splits,
    splitNature: (account) => accountNature(account, doc.kind),
  });
  if (!pieceLines) {
    anomalies.push({
      ...context,
      code: "piece_desequilibree",
      severity: "blocking",
      message: "Écriture de facture déséquilibrée : pièce exclue.",
      documentNumber: doc.documentNumber,
      amountCents: doc.totalCents,
    });
    return;
  }
  lines.push(...pieceLines);
}

function resolveQuoteInvoiceTotalCents(data: Record<string, unknown>): number | null {
  const quote = parseStoredPriceQuote(data.pricingQuote);
  if (!quote) {
    return null;
  }
  try {
    return resolveRegistrationDonationPricing(quote, data).invoiceTotalCents;
  } catch {
    return quote.totalCents;
  }
}

function pushExceptionalDiscountGap(
  anomalies: SageExportAnomaly[],
  context: SagePartyContext,
  data: Record<string, unknown>,
  invoices: AccountingInvoiceDocument[]
): void {
  const discountCents = sumExceptionalDiscountCents(getRegistrationPaymentAids(data));
  if (discountCents <= 0 || invoices.length === 0) {
    return;
  }
  const quoteTotal = resolveQuoteInvoiceTotalCents(data);
  if (quoteTotal == null) {
    return;
  }
  const expectedNet = Math.max(0, quoteTotal - discountCents);
  const actualNet = sumAccountingInvoicesNetCents(invoices);
  const gap = actualNet - expectedNet;
  if (gap <= 0) {
    return;
  }
  anomalies.push({
    ...context,
    code: "remise_exceptionnelle",
    severity: "blocking",
    message:
      "Remise exceptionnelle sans avoir comptable. L'applicatif doit émettre un AVO ; écriture provisoire : OD débit 756000, crédit 411000.",
    documentNumber: "",
    amountCents: gap,
  });
}

function accountNature(account: string, kind: AccountingInvoiceDocument["kind"]): string {
  if (account === SAGE_ACCOUNTS.ffttPayable) {
    return kind === "credit_note" ? "Avoir licence FFTT" : "Licence FFTT";
  }
  if (account === SAGE_ACCOUNTS.donation) {
    return kind === "credit_note" ? "Avoir don" : "Don";
  }
  if (kind === "credit_note") {
    return "Avoir cotisation";
  }
  if (kind === "supplement") {
    return "Complément cotisation";
  }
  return "Cotisation";
}
