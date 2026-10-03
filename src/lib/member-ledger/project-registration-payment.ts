import { normalizeRegistrationPayment } from "@/lib/club-registration/payment/normalize-payment";
import { getRegistrationPaymentAids } from "@/lib/club-registration/payment/aid-receipt";
import { resolveRegistrationInvoiceLines } from "@/lib/club-registration/payment-documents/build-invoice-view-model";
import { isInvoiceDocumentAvailable } from "@/lib/club-registration/payment-documents/availability";
import {
  parseAccountingInvoices,
  sumAccountingInvoicesNetCents,
} from "@/lib/club-registration/payment-documents/accounting-invoice-parse";
import {
  hasAidDocumentNumber,
  isReceivedCollectableAid,
} from "@/lib/club-registration/payment-documents/aid-document-helpers";
import type {
  LedgerCharge,
  LedgerPayment,
  MemberLedgerView,
} from "./types";

function resolveSeasonLabel(data: Record<string, unknown>): string {
  if (typeof data.seasonLabel === "string" && data.seasonLabel.trim()) {
    return data.seasonLabel.trim();
  }
  if (typeof data.season === "string" && data.season.trim()) {
    return data.season.trim();
  }
  return String(new Date().getFullYear());
}

function resolveOccurredAt(data: Record<string, unknown>): string | null {
  const paymentRequestedAt = data.paymentRequestedAt;
  if (typeof paymentRequestedAt === "string" && paymentRequestedAt.trim()) {
    return paymentRequestedAt;
  }
  if (
    paymentRequestedAt &&
    typeof paymentRequestedAt === "object" &&
    "toDate" in paymentRequestedAt &&
    typeof (paymentRequestedAt as { toDate: () => Date }).toDate === "function"
  ) {
    return (paymentRequestedAt as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

function mapChargeStatus(
  invoicedCents: number,
  receivedCents: number
): LedgerCharge["status"] {
  if (invoicedCents <= 0) {
    return "open";
  }
  if (receivedCents <= 0) {
    return "open";
  }
  if (receivedCents >= invoicedCents) {
    return "paid";
  }
  return "partially_paid";
}

/**
 * Projette le paiement d'adhésion d'un dossier vers le contrat ledger.
 * Lecture seule — n'attribue aucun numéro comptable.
 */
export function projectRegistrationPaymentToLedger(
  registrationId: string,
  data: Record<string, unknown>
): MemberLedgerView {
  const seasonLabel = resolveSeasonLabel(data);
  const party = {
    registrationId,
    seasonLabel,
    memberAccountId: null as string | null,
  };

  const accountingInvoices = parseAccountingInvoices(data);
  const { lines, totalCents } = resolveRegistrationInvoiceLines(data);
  const payment = normalizeRegistrationPayment(data);
  const invoiceNumber =
    typeof data.teamupInvoiceNumber === "string" && data.teamupInvoiceNumber.trim()
      ? data.teamupInvoiceNumber.trim()
      : null;

  const charges: LedgerCharge[] = [];
  const payments: LedgerPayment[] = [];

  const invoiceEngaged =
    accountingInvoices.length > 0 || isInvoiceDocumentAvailable(data);
  const invoicedFromSnapshots =
    accountingInvoices.length > 0
      ? sumAccountingInvoicesNetCents(accountingInvoices)
      : null;
  const invoicedCents =
    invoicedFromSnapshots != null
      ? Math.max(0, invoicedFromSnapshots)
      : invoiceEngaged
        ? totalCents
        : payment?.amountToPayCents && payment.amountToPayCents > 0
          ? payment.amountToPayCents
          : 0;

  if (accountingInvoices.length > 0) {
    for (const doc of accountingInvoices) {
      charges.push({
        id: `invoice:${doc.id}`,
        kind: "membership",
        label: doc.label,
        amountCents: doc.totalCents,
        currency: "EUR",
        status: "open",
        occurredAt: doc.issuedAt,
        source: "registration",
        documentNumber: doc.documentNumber,
      });
    }
  } else if (invoiceEngaged || invoicedCents > 0 || lines.length > 0) {
    const label =
      lines.length === 1
        ? lines[0]!.label
        : lines.length > 1
          ? `Adhésion (${lines.length} lignes)`
          : "Adhésion SQY Ping";
    charges.push({
      id: `membership:${registrationId}`,
      kind: "membership",
      label,
      amountCents: Math.max(invoicedCents, totalCents),
      currency: "EUR",
      status: "open",
      occurredAt: resolveOccurredAt(data),
      source: "registration",
      documentNumber: invoiceNumber,
    });
  }

  if (payment) {
    for (const line of payment.receivedPayments) {
      if (line.amountCents <= 0) {
        continue;
      }
      const stripeLike =
        line.method === "card" ||
        (typeof line.reference === "string" &&
          line.reference.toLowerCase().includes("stripe"));
      const lineNumber =
        typeof line.documentNumber === "string" && line.documentNumber.trim()
          ? line.documentNumber.trim()
          : null;
      payments.push({
        id: line.id,
        label: line.label || `Encaissement ${line.method}`,
        amountCents: line.amountCents,
        currency: "EUR",
        method: line.method,
        paidAt: line.receivedAt ?? null,
        reference: line.reference ?? null,
        source: stripeLike ? "stripe" : "registration",
        allocatedToChargeIds: charges.map((c) => c.id),
        documentNumber: lineNumber,
        reversedAt: line.reversedAt ?? null,
      });
    }
  }

  for (const aid of getRegistrationPaymentAids(data)) {
    if (!isReceivedCollectableAid(aid)) {
      continue;
    }
    payments.push({
      id: `aid:${aid.type}`,
      label: aid.label || `Aide ${aid.type}`,
      amountCents: aid.amountCents,
      currency: "EUR",
      method: "aid",
      paidAt: aid.receivedAt ?? null,
      reference: aid.reference ?? null,
      source: "registration",
      allocatedToChargeIds: charges.map((c) => c.id),
      documentNumber: hasAidDocumentNumber(aid) ? aid.documentNumber!.trim() : null,
    });
  }

  const activeReceivedCents = payments
    .filter((p) => !p.reversedAt)
    .reduce((sum, p) => sum + p.amountCents, 0);
  const chargeTotal = charges.reduce((sum, c) => sum + c.amountCents, 0);

  const chargeStatus = mapChargeStatus(Math.max(0, chargeTotal), activeReceivedCents);
  for (const charge of charges) {
    if (charge.amountCents >= 0) {
      charge.status = chargeStatus;
    } else {
      charge.status = "voided";
    }
  }

  return {
    party,
    charges,
    payments,
    totals: {
      invoicedCents: Math.max(0, chargeTotal),
      receivedCents: activeReceivedCents,
      balanceCents: Math.max(0, chargeTotal - activeReceivedCents),
    },
  };
}
