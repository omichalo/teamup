import { PAYMENT_STATUS_LABELS } from "@/lib/club-registration/payment-constants";
import { formatMedicalFollowUpLabel } from "@/lib/club-registration/medical-certificate";
import { LICENSE_VALIDATION_STATUS_LABELS } from "@/lib/license-validation/license-validation-status";

export { LICENSE_VALIDATION_STATUS_LABELS };

export function formatCompetitorLabel(wantsCompetitorExtras: boolean): string {
  return wantsCompetitorExtras ? "Oui" : "Non";
}

export function formatPaidLabel(paymentStatus: string | null): string {
  if (!paymentStatus) {
    return "—";
  }
  return PAYMENT_STATUS_LABELS[paymentStatus as keyof typeof PAYMENT_STATUS_LABELS] ?? paymentStatus;
}

/** Synthèse secrétariat : OK / PPS attendu / certificat attendu ou reçu. */
export function formatMedicalCertificateLabel(
  status: string | null,
  declaration?: string | null
): string {
  return formatMedicalFollowUpLabel(declaration, status);
}

export function formatAttestationLabel(wantsRegistrationCertificate: boolean): string {
  return wantsRegistrationCertificate ? "Demandée" : "Non demandée";
}

export function formatBirthDate(value: string | null): string {
  if (!value) {
    return "—";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString("fr-FR");
}
