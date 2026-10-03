import {
  PAYMENT_METHOD_LABELS,
  RECEIVED_PAYMENT_METHOD_LABELS,
  type PaymentMethodId,
} from "@/lib/club-registration/payment-constants";
import type { ReceivedPayment } from "@/lib/club-registration/payment/types";

export type PrimaryReceivedPayment = Pick<
  ReceivedPayment,
  "id" | "method" | "amountCents" | "receivedAt"
>;

/**
 * Moyen de paiement « le plus important » : montant le plus élevé parmi les
 * encaissements actifs ; en cas d’égalité, le plus récent.
 */
export function selectPrimaryReceivedPayment(
  payments: readonly PrimaryReceivedPayment[]
): PrimaryReceivedPayment | null {
  const active = payments.filter(
    (line) => line.amountCents > 0 && Boolean(line.receivedAt)
  );
  if (active.length === 0) {
    return null;
  }

  return active.reduce((best, current) => {
    if (current.amountCents > best.amountCents) {
      return current;
    }
    if (current.amountCents < best.amountCents) {
      return best;
    }
    return current.receivedAt > best.receivedAt ? current : best;
  });
}

function resolveDeclaredPaymentMethodLabel(
  paymentMethod: PaymentMethodId | string | null | undefined
): string | null {
  if (!paymentMethod || typeof paymentMethod !== "string") {
    return null;
  }
  if (paymentMethod in PAYMENT_METHOD_LABELS) {
    return PAYMENT_METHOD_LABELS[paymentMethod as PaymentMethodId];
  }
  return null;
}

/**
 * Libellé moyen de paiement pour l’attestation :
 * 1) encaissement dominant, 2) moyen déclaré du dossier, 3) fallback générique.
 */
export function resolvePrimaryPaymentMethodLabel(
  payments: readonly PrimaryReceivedPayment[],
  options?: {
    declaredPaymentMethod?: PaymentMethodId | string | null;
    fallbackLabel?: string;
  }
): string {
  const primary = selectPrimaryReceivedPayment(payments);
  if (primary) {
    return RECEIVED_PAYMENT_METHOD_LABELS[primary.method] ?? primary.method;
  }
  return (
    resolveDeclaredPaymentMethodLabel(options?.declaredPaymentMethod) ??
    options?.fallbackLabel ??
    "Enregistré par le club"
  );
}
