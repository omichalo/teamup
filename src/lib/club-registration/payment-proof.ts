type RegistrationRecord = Record<string, unknown>;

export function isRegistrationPaidRecord(data: RegistrationRecord): boolean {
  return (
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
