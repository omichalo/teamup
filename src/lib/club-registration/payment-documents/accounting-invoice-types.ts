/**
 * Snapshots comptables figés (factures / avoirs) rattachés à un dossier.
 * Une fois émis, le contenu n'est plus recalculé depuis le devis courant.
 */

export const ACCOUNTING_INVOICE_KINDS = [
  "invoice",
  "supplement",
  "credit_note",
] as const;
export type AccountingInvoiceKind = (typeof ACCOUNTING_INVOICE_KINDS)[number];

export type AccountingInvoiceLine = {
  label: string;
  amountCents: number;
};

export type AccountingInvoiceDocument = {
  id: string;
  kind: AccountingInvoiceKind;
  /** FAC-… (invoice/supplement) ou AVO-… (credit_note). */
  documentNumber: string;
  label: string;
  lines: AccountingInvoiceLine[];
  /**
   * Montant signé de la pièce :
   * - positif pour invoice / supplement
   * - négatif pour credit_note
   */
  totalCents: number;
  issuedAt: string;
  /** Total devis net après application de cette pièce (somme cumulée des totalCents). */
  quoteTotalAfterCents: number;
  reason?: string;
};

export const ACCOUNTING_INVOICES_FIELD = "accountingInvoices";
