import { normalizeRegistrationPayment } from "@/lib/club-registration/payment/normalize-payment";
import { resolveOnlinePayableCents } from "@/lib/club-registration/payment/resolve-remaining-payable";
import { isRegistrationSupplementDue } from "@/lib/club-registration/payment/registration-supplement";
import { isRegistrationPaidRecord } from "@/lib/club-registration/payment-proof";
import type { RegistrationSummary } from "@/components/club-registration/membership-requests/types";

const QUICK_PAYMENT_ELIGIBLE_STATUSES = new Set(["submitted", "in_review"]);

export function resolveQuickPaymentAmountCents(
  registration: RegistrationSummary
): number | null {
  const payment =
    registration.payment ??
    normalizeRegistrationPayment(registration as unknown as Record<string, unknown>);

  if (typeof registration.paymentAmountCents === "number" && registration.paymentAmountCents > 0) {
    return registration.paymentAmountCents;
  }

  if (payment && payment.amountToPayCents > 0) {
    return payment.amountToPayCents;
  }

  if (payment && payment.totalAmountCents > 0) {
    return payment.totalAmountCents;
  }

  return null;
}

export function canMarkCertificateReceived(registration: RegistrationSummary): boolean {
  return registration.medicalCertificateStatus === "required_not_received";
}

export function canMarkCertificateValidated(registration: RegistrationSummary): boolean {
  return registration.medicalCertificateStatus === "received";
}

export function canQuickRequestPayment(registration: RegistrationSummary): boolean {
  const status = registration.status;
  if (!status || !QUICK_PAYMENT_ELIGIBLE_STATUSES.has(status)) {
    return false;
  }
  if (registration.paymentStatus === "paid" || isRegistrationPaidRecord(registration)) {
    return false;
  }
  const amountCents = resolveQuickPaymentAmountCents(registration);
  return amountCents !== null && amountCents > 0;
}

export function canQuickRequestSupplementPayment(registration: RegistrationSummary): boolean {
  const payment =
    registration.payment ??
    normalizeRegistrationPayment(registration as unknown as Record<string, unknown>);
  if (!payment || !isRegistrationSupplementDue(payment)) {
    return false;
  }
  return resolveOnlinePayableCents(payment) > 0;
}

export function canQuickResendPaymentLink(registration: RegistrationSummary): boolean {
  if (canQuickRequestSupplementPayment(registration)) {
    return true;
  }
  if (registration.status !== "payment_requested") {
    return false;
  }
  if (registration.paymentStatus === "paid" || isRegistrationPaidRecord(registration)) {
    return false;
  }
  const payment =
    registration.payment ??
    normalizeRegistrationPayment(registration as unknown as Record<string, unknown>);
  if (payment && resolveOnlinePayableCents(payment) <= 0) {
    return false;
  }
  const amountCents = resolveQuickPaymentAmountCents(registration);
  return amountCents !== null && amountCents > 0;
}
