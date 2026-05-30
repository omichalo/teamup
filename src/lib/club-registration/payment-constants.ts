/** Nombre maximum d'échéances (CB et chèque — même plafond). */
export const MAX_PAYMENT_INSTALLMENTS = 4;

/** Ordre des chèques affiché à l'adhérent (compléter si besoin via config club). */
export const CHECK_PAYABLE_TO = "SQY Ping";

export const PAYMENT_METHOD_IDS = [
  "card",
  "cheque",
  "holiday_vouchers",
  "other",
] as const;

export type PaymentMethodId = (typeof PAYMENT_METHOD_IDS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodId, string> = {
  card: "Carte bancaire",
  cheque: "Chèque",
  holiday_vouchers: "Chèques vacances",
  other: "Autre / cas particulier",
};

export const REMAINING_PAYMENT_METHOD_IDS = [
  "card",
  "cheque",
  "cash",
  "other",
  "secretariat",
] as const;

export type RemainingPaymentMethodId = (typeof REMAINING_PAYMENT_METHOD_IDS)[number];

export const REMAINING_PAYMENT_METHOD_LABELS: Record<RemainingPaymentMethodId, string> = {
  card: "Carte bancaire",
  cheque: "Chèque",
  cash: "Espèces",
  other: "Autre",
  secretariat: "À définir avec le secrétariat",
};

export const RECEIVED_PAYMENT_METHOD_IDS = [
  "card",
  "cheque",
  "holiday_vouchers",
  "cash",
  "other",
] as const;

export type ReceivedPaymentMethodId = (typeof RECEIVED_PAYMENT_METHOD_IDS)[number];

export const RECEIVED_PAYMENT_METHOD_LABELS: Record<ReceivedPaymentMethodId, string> = {
  card: "Carte bancaire",
  cheque: "Chèque",
  holiday_vouchers: "Chèques vacances",
  cash: "Espèces",
  other: "Autre",
};

export const PAYMENT_STATUS_IDS = [
  "pending_validation",
  "waiting_payment",
  "partially_paid",
  "paid",
  "manual_follow_up",
] as const;

export type PaymentStatusId = (typeof PAYMENT_STATUS_IDS)[number];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatusId, string> = {
  pending_validation: "En attente de validation",
  waiting_payment: "En attente de paiement",
  partially_paid: "Paiement partiel",
  paid: "Payé",
  manual_follow_up: "Suivi au secrétariat",
};

export const EXPECTED_PAYMENT_STATUS_IDS = ["expected", "received", "cancelled"] as const;

export type ExpectedPaymentStatusId = (typeof EXPECTED_PAYMENT_STATUS_IDS)[number];

export const PAYMENT_NOTE_MAX_LENGTH = 2000;
export const PAYMENT_AID_NOTE_MAX_LENGTH = 500;
