type RegistrationRecord = Record<string, unknown>;

function hasPaidAtRecorded(data: RegistrationRecord): boolean {
  const paidAt = data.paidAt;
  if (paidAt == null) {
    return false;
  }
  if (typeof paidAt === "string") {
    return paidAt.trim().length > 0;
  }
  if (typeof paidAt === "object" && typeof (paidAt as { toDate?: () => Date }).toDate === "function") {
    return true;
  }
  return false;
}

export function isRegistrationPaidRecord(data: RegistrationRecord): boolean {
  return (
    hasPaidAtRecorded(data) ||
    data.status === "paid" ||
    data.paymentStatus === "paid" ||
    data.paymentStatus === "complete"
  );
}

export function hasStripeInvoiceId(data: RegistrationRecord): boolean {
  return (
    typeof data.stripeInvoiceId === "string" && data.stripeInvoiceId.trim().length > 0
  );
}

export function hasPaymentProofAvailable(data: RegistrationRecord): boolean {
  return hasStripeInvoiceId(data) || isRegistrationPaidRecord(data);
}
