import type {
  ExpectedPaymentStatusId,
  PaymentMethodId,
  PaymentStatusId,
  ReceivedPaymentMethodId,
  RemainingPaymentMethodId,
} from "../payment-constants";

export type PaymentAid = {
  type: string;
  label: string;
  amountCents: number;
  reference?: string;
  note?: string;
  /** Aide collectable effectivement reçue par le club (Pass Sport, Labaz, etc.). */
  received?: boolean;
  receivedAt?: string;
  receivedBy?: string;
  /**
   * N° de pièce comptable d'aide reçue (AID-…), attribué à la réception.
   * Conservé même si la réception est annulée ensuite (piste d'audit).
   */
  documentNumber?: string;
};

export type ExpectedPayment = {
  id: string;
  method: ReceivedPaymentMethodId;
  label: string;
  expectedAmountCents: number;
  dueLabel?: string;
  status: ExpectedPaymentStatusId;
  note?: string;
};

export type ReceivedPayment = {
  id: string;
  method: ReceivedPaymentMethodId;
  label: string;
  amountCents: number;
  receivedAt: string;
  recordedBy?: string;
  /** N° de chèque / chèque vacances ou autre référence (optionnel). */
  reference?: string;
  note?: string;
  expectedPaymentId?: string;
  /**
   * N° de pièce comptable d'encaissement (REC-…), un par paiement.
   * Attribué à l'enregistrement (ou au rattrapage), jamais à la consultation.
   */
  documentNumber?: string;
  /** Encaissement annulé (erreur de saisie, remboursement manuel hors Stripe). */
  reversedAt?: string;
  reversedBy?: string;
  reversalReason?: string;
};

export type RegistrationPayment = {
  totalAmountCents: number;
  assistanceTotalAmountCents: number;
  amountToPayCents: number;
  aids: PaymentAid[];
  paymentMethod: PaymentMethodId;
  paymentInstallments: number;
  expectedPayments: ExpectedPayment[];
  receivedPayments: ReceivedPayment[];
  paidAmountCents: number;
  remainingAmountCents: number;
  holidayVoucherAmountCents?: number;
  remainingPaymentMethod?: RemainingPaymentMethodId;
  paymentNote?: string;
  specialPaymentNote?: string;
  paymentStatus: PaymentStatusId;
  stripePaymentUrl?: string;
  stripePaymentIntentId?: string;
  stripeInvoiceId?: string;
};

/** Champs paiement portés par le draft / payload d'inscription. */
export type PaymentDraftFields = {
  paymentMethod: PaymentMethodId | "";
  paymentInstallments: number;
  paymentAids: PaymentAid[];
  holidayVoucherAmountCents: number | null;
  remainingPaymentMethod: RemainingPaymentMethodId | "";
  paymentNote: string;
  specialPaymentNote: string;
};

export type PaymentSummary = {
  assistanceTotalAmountCents: number;
  amountToPayCents: number;
  paidAmountCents: number;
  remainingAmountCents: number;
  paymentStatus: PaymentStatusId;
  aidsExceedTotal: boolean;
};
