import {
  RECEIVED_PAYMENT_METHOD_IDS,
  type PaymentMethodId,
  type ReceivedPaymentMethodId,
} from "../payment-constants";

const RECEIVED_METHOD_SET = new Set<string>(RECEIVED_PAYMENT_METHOD_IDS);

/** Le mode prévu d'inscription est toujours un moyen d'encaissement possible. */
export function receivedMethodFromPlanned(
  paymentMethod: PaymentMethodId
): ReceivedPaymentMethodId {
  if (RECEIVED_METHOD_SET.has(paymentMethod)) {
    return paymentMethod as ReceivedPaymentMethodId;
  }
  return "other";
}
