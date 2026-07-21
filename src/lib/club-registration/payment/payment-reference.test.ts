import {
  normalizePaymentReference,
  paymentReferenceFieldLabel,
} from "@/lib/club-registration/payment/payment-reference";

describe("payment-reference", () => {
  it("normalizes optional reference", () => {
    expect(normalizePaymentReference("  ABC-123  ")).toBe("ABC-123");
    expect(normalizePaymentReference("")).toBeUndefined();
    expect(normalizePaymentReference("   ")).toBeUndefined();
    expect(normalizePaymentReference(null)).toBeUndefined();
  });

  it("returns method-specific labels", () => {
    expect(paymentReferenceFieldLabel("cheque")).toContain("chèque");
    expect(paymentReferenceFieldLabel("holiday_vouchers")).toContain("vacances");
  });
});
