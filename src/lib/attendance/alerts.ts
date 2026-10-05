import { normalizeMedicalCertificateStatus } from "@/lib/club-registration/medical-certificate";
import { normalizePpsFollowUpStatus } from "@/lib/club-registration/pps-follow-up";
import { normalizeRegistrationPayment } from "@/lib/club-registration/payment/normalize-payment";
import { resolveRegistrationPaymentStatus } from "@/lib/club-registration/resolve-registration-payment-status";
import type { AttendanceAlert } from "./constants";

/**
 * Alertes dossier pour le pointage.
 * `unpaid` : solde réellement dû (`remainingAmountCents > 0`) quand un paiement
 * normalisable existe ; sinon fallback statut / paymentStatus legacy.
 */
export function attendanceAlertsFromRegistration(
  data: Record<string, unknown>
): AttendanceAlert[] {
  const alerts: AttendanceAlert[] = [];
  const payment = normalizeRegistrationPayment(data);

  if (payment) {
    if (payment.remainingAmountCents > 0) {
      alerts.push("unpaid");
    }
  } else {
    const status = typeof data.status === "string" ? data.status : null;
    const paymentStatus = resolveRegistrationPaymentStatus(data);
    const paid = status === "paid" || paymentStatus === "paid";
    if (!paid) {
      alerts.push("unpaid");
    }
  }

  const certificate = normalizeMedicalCertificateStatus(
    data.medicalCertificateStatus,
    typeof data.medicalCertificateDeclaration === "string"
      ? data.medicalCertificateDeclaration
      : null
  );
  if (certificate === "required_not_received") {
    alerts.push("certificate");
  }

  const pps = normalizePpsFollowUpStatus(
    data.ppsFollowUpStatus,
    typeof data.medicalCertificateDeclaration === "string"
      ? data.medicalCertificateDeclaration
      : null,
    typeof data.birthDate === "string" ? data.birthDate : null
  );
  if (pps === "expected" || pps === "checked_incomplete") {
    alerts.push("pps");
  }

  return alerts;
}

import { isTerminalInactiveRegistrationStatus } from "@/lib/club-registration/registration-status";

export function isRejectedRegistration(data: Record<string, unknown>): boolean {
  return isTerminalInactiveRegistrationStatus(
    typeof data.status === "string" ? data.status : null
  );
}
