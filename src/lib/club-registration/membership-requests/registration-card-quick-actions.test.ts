import {
  canMarkCertificateReceived,
  canMarkCertificateValidated,
  canQuickRequestPayment,
  resolveQuickPaymentAmountCents,
} from "./registration-card-quick-actions";
import type { RegistrationSummary } from "@/components/club-registration/membership-requests/types";

function baseSummary(overrides: Partial<RegistrationSummary> = {}): RegistrationSummary {
  return {
    id: "reg-1",
    status: "in_review",
    ...overrides,
  };
}

describe("registration-card-quick-actions", () => {
  it("detects certificate markable as received or validated", () => {
    expect(
      canMarkCertificateReceived(
        baseSummary({ medicalCertificateStatus: "required_not_received" })
      )
    ).toBe(true);
    expect(
      canMarkCertificateValidated(baseSummary({ medicalCertificateStatus: "received" }))
    ).toBe(true);
    expect(
      canMarkCertificateValidated(baseSummary({ medicalCertificateStatus: "validated" }))
    ).toBe(false);
  });

  it("resolves quick payment amount from paymentAmountCents", () => {
    expect(
      resolveQuickPaymentAmountCents(baseSummary({ paymentAmountCents: 22_400 }))
    ).toBe(22_400);
  });

  it("allows quick payment when amount and status are eligible", () => {
    expect(
      canQuickRequestPayment(
        baseSummary({ status: "in_review", paymentAmountCents: 22_400 })
      )
    ).toBe(true);
    expect(
      canQuickRequestPayment(
        baseSummary({ status: "payment_requested", paymentAmountCents: 22_400 })
      )
    ).toBe(false);
  });
});
