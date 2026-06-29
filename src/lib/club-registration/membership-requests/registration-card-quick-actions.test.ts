import {
  canMarkCertificateReceived,
  canMarkCertificateValidated,
  canQuickRequestPayment,
  canQuickResendPaymentLink,
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

  it("allows quick resend for payment_requested card dossiers", () => {
    expect(
      canQuickResendPaymentLink(
        baseSummary({
          status: "payment_requested",
          paymentAmountCents: 22_400,
          payment: {
            paymentMethod: "card",
            amountToPayCents: 22_400,
            totalAmountCents: 22_400,
            assistanceTotalAmountCents: 0,
            aids: [],
            paymentInstallments: 1,
            expectedPayments: [],
            receivedPayments: [],
            paidAmountCents: 0,
            remainingAmountCents: 22_400,
            paymentStatus: "waiting_payment",
          },
        })
      )
    ).toBe(true);
    expect(
      canQuickResendPaymentLink(
        baseSummary({ status: "in_review", paymentAmountCents: 22_400 })
      )
    ).toBe(false);
    expect(
      canQuickResendPaymentLink(
        baseSummary({
          status: "payment_requested",
          paymentStatus: "pending",
          paidAt: "2026-06-27T08:31:30.000Z",
          paymentAmountCents: 22_400,
          payment: {
            paymentMethod: "card",
            amountToPayCents: 22_400,
            totalAmountCents: 22_400,
            assistanceTotalAmountCents: 0,
            aids: [],
            paymentInstallments: 1,
            expectedPayments: [],
            receivedPayments: [],
            paidAmountCents: 0,
            remainingAmountCents: 22_400,
            paymentStatus: "waiting_payment",
          },
        })
      )
    ).toBe(false);
  });
});
