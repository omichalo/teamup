import { isRegistrationPaidRecord } from "@/lib/club-registration/payment-proof";
import { normalizeRegistrationPayment } from "@/lib/club-registration/payment/normalize-payment";

/**
 * Attestation disponible uniquement pour un dossier soldé.
 * Si un bloc `payment` existe, le reste dû doit être nul.
 */
export function isRegistrationCertificateAvailable(
  data: Record<string, unknown>
): boolean {
  if (!isRegistrationPaidRecord(data)) {
    return false;
  }

  const payment = normalizeRegistrationPayment(data);
  if (!payment) {
    return true;
  }

  return payment.remainingAmountCents <= 0;
}
