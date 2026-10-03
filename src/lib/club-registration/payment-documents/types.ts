import type { ReceivedPaymentMethodId } from "@/lib/club-registration/payment-constants";

export type PaymentDocumentLine = {
  label: string;
  amountCents: number;
};

export type PaymentReceiptPaymentLine = {
  id: string;
  label: string;
  method: ReceivedPaymentMethodId;
  methodLabel: string;
  amountCents: number;
  receivedAt: string;
  receivedAtLabel: string;
  reference?: string;
  note?: string;
  documentNumber?: string;
};

/** Reçu unitaire — une pièce comptable REC par encaissement. */
export type PaymentReceiptViewModel = {
  registrationId: string;
  receivedPaymentId: string;
  /** N° séquentiel stable (ex. REC-2026-2027-00042). */
  documentNumber: string;
  clubName: string;
  title: string;
  adherentName: string;
  seasonLabel: string | null;
  issuedAtLabel: string;
  payment: PaymentReceiptPaymentLine;
  /** Contexte facture (informatif, sans répéter le n° FAC comme pièce du reçu). */
  invoicedTotalCents: number;
  paidTotalCents: number;
  remainingCents: number;
};

export type PaymentInvoiceViewModel = {
  registrationId: string;
  /** N° séquentiel stable (ex. FAC-… / AVO-…). */
  documentNumber: string;
  clubName: string;
  title: string;
  adherentName: string;
  seasonLabel: string | null;
  issuedAtLabel: string;
  quoteLines: PaymentDocumentLine[];
  /** Montant de la pièce (toujours positif à l'affichage). */
  invoicedTotalCents: number;
  isCreditNote?: boolean;
  reason?: string;
};

/** Justificatif d'aide reçue (pièce AID). */
export type PaymentAidReceiptViewModel = {
  registrationId: string;
  aidType: string;
  documentNumber: string;
  clubName: string;
  title: string;
  adherentName: string;
  seasonLabel: string | null;
  issuedAtLabel: string;
  aidLabel: string;
  amountCents: number;
  reference?: string;
  note?: string;
};

/**
 * État de situation — document informatif régénérable (pas une pièce comptable).
 * Affiche facture + tous encaissements + solde.
 */
export type PaymentSituationViewModel = {
  registrationId: string;
  clubName: string;
  title: string;
  settlementLabel: "Soldé" | "Partiellement payé" | "En attente";
  isFullySettled: boolean;
  adherentName: string;
  seasonLabel: string | null;
  issuedAtLabel: string;
  invoiceNumber: string | null;
  quoteLines: PaymentDocumentLine[];
  invoicedTotalCents: number;
  payments: PaymentReceiptPaymentLine[];
  paidTotalCents: number;
  remainingCents: number;
};

export type PaymentReceiptSummary = {
  id: string;
  documentNumber: string | null;
  amountCents: number;
  receivedAt: string;
  method: string;
  label: string;
};

export type PaymentInvoiceSummary = {
  id: string;
  kind: "invoice" | "supplement" | "credit_note";
  documentNumber: string;
  label: string;
  totalCents: number;
  issuedAt: string;
};

export type PaymentAidReceiptSummary = {
  type: string;
  documentNumber: string | null;
  amountCents: number;
  label: string;
  receivedAt: string | null;
};

export type PaymentDocumentsAvailability = {
  invoiceAvailable: boolean;
  /** True s'il existe au moins un encaissement (reçus unitaires et/ou situation). */
  receiptAvailable: boolean;
  situationAvailable: boolean;
  receipts: PaymentReceiptSummary[];
  invoices: PaymentInvoiceSummary[];
  aidReceipts: PaymentAidReceiptSummary[];
};
