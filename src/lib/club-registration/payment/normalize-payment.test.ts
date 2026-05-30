import { normalizeRegistrationPayment } from "./normalize-payment";

describe("normalizeRegistrationPayment", () => {
  it("lit l'objet payment imbriqué", () => {
    const payment = normalizeRegistrationPayment({
      payment: {
        totalAmountCents: 22_200,
        assistanceTotalAmountCents: 6_000,
        amountToPayCents: 16_200,
        aids: [{ type: "pass_sport", label: "Pass Sport", amountCents: 6_000 }],
        paymentMethod: "cheque",
        paymentInstallments: 4,
        expectedPayments: [],
        receivedPayments: [],
        paidAmountCents: 0,
        remainingAmountCents: 16_200,
        paymentStatus: "pending_validation",
      },
    });
    expect(payment?.amountToPayCents).toBe(16_200);
    expect(payment?.paymentMethod).toBe("cheque");
  });

  it("reconstruit depuis les champs plats legacy", () => {
    const payment = normalizeRegistrationPayment({
      paymentAmountCents: 18_000,
      paymentStatus: "pending",
      pricingQuote: { totalCents: 22_000 },
    });
    expect(payment?.totalAmountCents).toBe(22_000);
    expect(payment?.amountToPayCents).toBe(18_000);
    expect(payment?.paymentStatus).toBe("waiting_payment");
  });
});
