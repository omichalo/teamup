import {
  hasPaymentProofAvailable,
  isRegistrationPaidRecord,
} from "@/lib/club-registration/payment-proof";

describe("payment-proof", () => {
  it("considère une preuve disponible avec facture Stripe", () => {
    expect(hasPaymentProofAvailable({ stripeInvoiceId: "in_123" })).toBe(true);
  });

  it("considère une preuve disponible pour un dossier payé sans Stripe", () => {
    expect(hasPaymentProofAvailable({ status: "paid" })).toBe(true);
  });

  it("refuse une preuve si le dossier n'est pas payé", () => {
    expect(isRegistrationPaidRecord({ status: "payment_requested" })).toBe(false);
  });
});
