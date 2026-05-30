export {
  MAX_PAYMENT_INSTALLMENTS,
  CHECK_PAYABLE_TO,
  PAYMENT_METHOD_IDS,
  PAYMENT_METHOD_LABELS,
  REMAINING_PAYMENT_METHOD_IDS,
  REMAINING_PAYMENT_METHOD_LABELS,
  RECEIVED_PAYMENT_METHOD_IDS,
  RECEIVED_PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_IDS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_NOTE_MAX_LENGTH,
  PAYMENT_AID_NOTE_MAX_LENGTH,
  type PaymentMethodId,
  type PaymentStatusId,
  type RemainingPaymentMethodId,
  type ReceivedPaymentMethodId,
} from "../payment-constants";

export type {
  PaymentAid,
  ExpectedPayment,
  ReceivedPayment,
  RegistrationPayment,
  PaymentDraftFields,
  PaymentSummary,
} from "./types";

export {
  calculatePaymentSummary,
  type CalculatePaymentSummaryInput,
} from "./calculate-payment-summary";

export {
  generateExpectedPayments,
  splitAmountAcrossInstallments,
  type GenerateExpectedPaymentsInput,
} from "./generate-expected-payments";

export {
  buildPaymentFromDraft,
  mergePaymentAidsFromDraft,
  type BuildPaymentFromDraftInput,
} from "./build-payment-from-draft";

export {
  normalizeRegistrationPayment,
  paymentToFirestoreUpdate,
  isExpectedPaymentStatusId,
  isReceivedMethodIdSafe,
} from "./normalize-payment";
