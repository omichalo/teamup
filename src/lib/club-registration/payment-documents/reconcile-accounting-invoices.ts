import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { resolveRegistrationInvoiceLines } from "./build-invoice-view-model";
import { isInvoiceDocumentAvailable } from "./availability";
import {
  createAccountingInvoiceId,
  parseAccountingInvoices,
  sumAccountingInvoicesNetCents,
} from "./accounting-invoice-parse";
import { ACCOUNTING_INVOICES_FIELD } from "./accounting-invoice-types";
import type { AccountingInvoiceDocument } from "./accounting-invoice-types";
import {
  allocateAccountingDocumentNumberInTransaction,
  resolveAccountingSeasonKey,
} from "./allocate-sequence";
import { resolveRegistrationDonationPricing } from "@/lib/club-registration/resolve-registration-donation";
import { parseStoredPriceQuote } from "@/lib/pricing/parse-stored-quote";

const REGISTRATIONS_COLLECTION = "clubRegistrations";

function resolveInvoiceTotalForAccounting(data: Record<string, unknown>): {
  lines: { label: string; amountCents: number }[];
  totalCents: number;
} {
  const { lines, totalCents } = resolveRegistrationInvoiceLines(data);
  const quote = parseStoredPriceQuote(data.pricingQuote);
  if (!quote) {
    return { lines, totalCents };
  }
  const donation = resolveRegistrationDonationPricing(quote, data);
  if (donation.invoiceTotalCents === totalCents) {
    return { lines, totalCents };
  }
  // Ajustement don : une ligne informative pour coller au total facturé.
  return {
    lines: [
      ...lines,
      ...(donation.donationDiscountCents !== 0
        ? [
            {
              label: "Ajustement don / remise",
              amountCents: donation.invoiceTotalCents - totalCents,
            },
          ]
        : []),
    ],
    totalCents: donation.invoiceTotalCents,
  };
}

function buildInitialInvoiceDocument(params: {
  documentNumber: string;
  lines: { label: string; amountCents: number }[];
  totalCents: number;
  issuedAt: string;
}): AccountingInvoiceDocument {
  return {
    id: createAccountingInvoiceId(),
    kind: "invoice",
    documentNumber: params.documentNumber,
    label: "Facture d'adhésion",
    lines: params.lines,
    totalCents: params.totalCents,
    issuedAt: params.issuedAt,
    quoteTotalAfterCents: params.totalCents,
  };
}

/**
 * Garantit un snapshot initial figé lorsque le n° FAC dossier existe
 * et qu'aucune pièce n'est encore enregistrée.
 */
export async function ensureInitialAccountingInvoiceSnapshot(params: {
  db: Firestore;
  registrationId: string;
  data: Record<string, unknown>;
}): Promise<AccountingInvoiceDocument[]> {
  const existing = parseAccountingInvoices(params.data);
  if (existing.length > 0) {
    return existing;
  }

  const invoiceNumber =
    typeof params.data.teamupInvoiceNumber === "string" &&
    params.data.teamupInvoiceNumber.trim()
      ? params.data.teamupInvoiceNumber.trim()
      : null;
  if (!invoiceNumber || !isInvoiceDocumentAvailable(params.data)) {
    return existing;
  }

  const { lines, totalCents } = resolveInvoiceTotalForAccounting(params.data);
  if (totalCents <= 0 && lines.length === 0) {
    return existing;
  }

  const doc = buildInitialInvoiceDocument({
    documentNumber: invoiceNumber,
    lines:
      lines.length > 0
        ? lines
        : [{ label: "Adhésion SQY Ping", amountCents: totalCents }],
    totalCents,
    issuedAt: new Date().toISOString(),
  });

  await params.db
    .collection(REGISTRATIONS_COLLECTION)
    .doc(params.registrationId)
    .set(
      {
        [ACCOUNTING_INVOICES_FIELD]: [doc],
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

  return [doc];
}

/**
 * Après changement de devis : émet FAC complémentaire ou AVOIR pour coller au nouveau total.
 * No-op si aucun snapshot initial (facture pas encore engagée).
 */
export async function reconcileAccountingInvoicesAfterQuoteChange(params: {
  db: Firestore;
  registrationId: string;
  data: Record<string, unknown>;
  newInvoiceTotalCents: number;
  reason?: string;
}): Promise<{
  documents: AccountingInvoiceDocument[];
  created: AccountingInvoiceDocument | null;
}> {
  const documents = parseAccountingInvoices(params.data);
  if (documents.length === 0) {
    return { documents, created: null };
  }

  const net = sumAccountingInvoicesNetCents(documents);
  const target = Math.max(0, params.newInvoiceTotalCents);
  if (target === net) {
    return { documents, created: null };
  }

  const seasonKey = resolveAccountingSeasonKey(params.data);
  const registrationRef = params.db
    .collection(REGISTRATIONS_COLLECTION)
    .doc(params.registrationId);
  const reason =
    params.reason?.trim() ||
    (target > net
      ? "Complément suite à modification du dossier"
      : "Avoir suite à modification du dossier");

  const created = await params.db.runTransaction(async (tx) => {
    const snap = await tx.get(registrationRef);
    const liveData = (snap.data() ?? {}) as Record<string, unknown>;
    const liveDocs = parseAccountingInvoices(liveData);
    if (liveDocs.length === 0) {
      return null;
    }
    const liveNet = sumAccountingInvoicesNetCents(liveDocs);
    const liveDelta = target - liveNet;
    if (liveDelta === 0) {
      return null;
    }

    const issuedAt = new Date().toISOString();
    let nextDoc: AccountingInvoiceDocument;

    if (liveDelta > 0) {
      const documentNumber = await allocateAccountingDocumentNumberInTransaction({
        tx,
        db: params.db,
        seasonKey,
        prefix: "FAC",
      });
      nextDoc = {
        id: createAccountingInvoiceId(),
        kind: "supplement",
        documentNumber,
        label: "Facture complémentaire",
        lines: [
          {
            label: "Complément — ajustement tarifaire",
            amountCents: liveDelta,
          },
        ],
        totalCents: liveDelta,
        issuedAt,
        quoteTotalAfterCents: liveNet + liveDelta,
        reason,
      };
    } else {
      const abs = Math.abs(liveDelta);
      const documentNumber = await allocateAccountingDocumentNumberInTransaction({
        tx,
        db: params.db,
        seasonKey,
        prefix: "AVO",
      });
      nextDoc = {
        id: createAccountingInvoiceId(),
        kind: "credit_note",
        documentNumber,
        label: "Avoir",
        lines: [
          {
            label: "Avoir — ajustement tarifaire",
            amountCents: abs,
          },
        ],
        totalCents: -abs,
        issuedAt,
        quoteTotalAfterCents: liveNet - abs,
        reason,
      };
    }

    tx.set(
      registrationRef,
      {
        [ACCOUNTING_INVOICES_FIELD]: [...liveDocs, nextDoc],
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return nextDoc;
  });

  return {
    documents: created ? [...documents, created] : documents,
    created,
  };
}
