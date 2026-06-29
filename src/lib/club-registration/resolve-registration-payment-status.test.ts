import { resolveRegistrationPaymentStatus } from "./resolve-registration-payment-status";

describe("resolveRegistrationPaymentStatus", () => {
  it("considère payé si paidAt est renseigné malgré paymentStatus legacy pending", () => {
    expect(
      resolveRegistrationPaymentStatus({
        paymentStatus: "pending",
        paidAt: "2026-06-27T08:31:30.000Z",
      })
    ).toBe("paid");
  });

  it("mappe pending vers waiting_payment sans paidAt", () => {
    expect(resolveRegistrationPaymentStatus({ paymentStatus: "pending" })).toBe(
      "waiting_payment"
    );
  });

  it("lit les statuts canoniques", () => {
    expect(
      resolveRegistrationPaymentStatus({ paymentStatus: "waiting_payment" })
    ).toBe("waiting_payment");
    expect(resolveRegistrationPaymentStatus({ paymentStatus: "paid" })).toBe("paid");
  });
});
