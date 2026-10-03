import type {
  AccountingInvoiceDocument,
  AccountingInvoiceKind,
  AccountingInvoiceLine,
} from "./accounting-invoice-types";
import { ACCOUNTING_INVOICES_FIELD } from "./accounting-invoice-types";

export function parseAccountingInvoices(
  data: Record<string, unknown>
): AccountingInvoiceDocument[] {
  const raw = data[ACCOUNTING_INVOICES_FIELD];
  if (!Array.isArray(raw)) {
    return [];
  }
  const docs: AccountingInvoiceDocument[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const kind = row.kind;
    if (kind !== "invoice" && kind !== "supplement" && kind !== "credit_note") {
      continue;
    }
    if (typeof row.id !== "string" || !row.id.trim()) continue;
    if (typeof row.documentNumber !== "string" || !row.documentNumber.trim()) continue;
    if (typeof row.label !== "string" || !row.label.trim()) continue;
    if (typeof row.totalCents !== "number" || !Number.isFinite(row.totalCents)) continue;
    if (typeof row.issuedAt !== "string" || !row.issuedAt.trim()) continue;
    if (
      typeof row.quoteTotalAfterCents !== "number" ||
      !Number.isFinite(row.quoteTotalAfterCents)
    ) {
      continue;
    }
    const linesRaw = Array.isArray(row.lines) ? row.lines : [];
    const lines: AccountingInvoiceLine[] = [];
    for (const line of linesRaw) {
      if (!line || typeof line !== "object") continue;
      const l = line as Record<string, unknown>;
      if (typeof l.label !== "string" || typeof l.amountCents !== "number") continue;
      lines.push({ label: l.label, amountCents: l.amountCents });
    }
    docs.push({
      id: row.id.trim(),
      kind: kind as AccountingInvoiceKind,
      documentNumber: row.documentNumber.trim(),
      label: row.label.trim(),
      lines,
      totalCents: row.totalCents,
      issuedAt: row.issuedAt.trim(),
      quoteTotalAfterCents: row.quoteTotalAfterCents,
      ...(typeof row.reason === "string" && row.reason.trim()
        ? { reason: row.reason.trim() }
        : {}),
    });
  }
  return docs;
}

export function sumAccountingInvoicesNetCents(
  docs: AccountingInvoiceDocument[]
): number {
  return docs.reduce((sum, doc) => sum + doc.totalCents, 0);
}

export function createAccountingInvoiceId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `inv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
