import { normalizeMedicalCertificateStatus } from "@/lib/club-registration/medical-certificate";
import { normalizePpsFollowUpStatus } from "@/lib/club-registration/pps-follow-up";
import { resolveRegistrationPaymentStatus } from "@/lib/club-registration/resolve-registration-payment-status";
import type { AttendanceAlert } from "./constants";

export function attendanceAlertsFromRegistration(
  data: Record<string, unknown>
): AttendanceAlert[] {
  const alerts: AttendanceAlert[] = [];
  const status = typeof data.status === "string" ? data.status : null;
  const paymentStatus = resolveRegistrationPaymentStatus(data);
  const paid =
    status === "paid" || paymentStatus === "paid";
  if (!paid) {
    alerts.push("unpaid");
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

export function isRejectedRegistration(data: Record<string, unknown>): boolean {
  return data.status === "rejected";
}
