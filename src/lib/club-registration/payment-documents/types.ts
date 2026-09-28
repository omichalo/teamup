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
};

export type PaymentReceiptViewModel = {
  registrationId: string;
  clubName: string;
  title: string;
  settlementLabel: "Soldé" | "Partiellement payé";
  isFullySettled: boolean;
  adherentName: string;
  seasonLabel: string | null;
  issuedAtLabel: string;
  quoteLines: PaymentDocumentLine[];
  invoicedTotalCents: number;
  payments: PaymentReceiptPaymentLine[];
  paidTotalCents: number;
  remainingCents: number;
};

export type PaymentInvoiceViewModel = {
  registrationId: string;
  clubName: string;
  title: string;
  adherentName: string;
  seasonLabel: string | null;
  issuedAtLabel: string;
  quoteLines: PaymentDocumentLine[];
  invoicedTotalCents: number;
};

export type PaymentDocumentsAvailability = {
  invoiceAvailable: boolean;
  receiptAvailable: boolean;
};
