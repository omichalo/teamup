import {
  generateExpectedPayments,
  splitAmountAcrossInstallments,
} from "./generate-expected-payments";

describe("splitAmountAcrossInstallments", () => {
  it("répartit 100 € en 3 fois avec arrondi sur la dernière échéance", () => {
    const amounts = splitAmountAcrossInstallments(10_000, 3);
    expect(amounts).toEqual([3333, 3333, 3334]);
    expect(amounts.reduce((a, b) => a + b, 0)).toBe(10_000);
  });

  it("répartit 200 € en 4 fois égales", () => {
    const amounts = splitAmountAcrossInstallments(20_000, 4);
    expect(amounts).toEqual([5000, 5000, 5000, 5000]);
  });
});

describe("generateExpectedPayments", () => {
  it("génère 4 lignes CB pour 200 €", () => {
    const expected = generateExpectedPayments({
      amountToPayCents: 20_000,
      paymentMethod: "card",
      paymentInstallments: 4,
    });
    expect(expected).toHaveLength(4);
    expect(expected[0].label).toBe("CB 1/4");
    expect(expected[0].expectedAmountCents).toBe(5000);
    expect(expected.every((e) => e.status === "expected")).toBe(true);
    expect(
      expected.reduce((sum, e) => sum + e.expectedAmountCents, 0)
    ).toBe(20_000);
  });

  it("génère des chèques pour paiement par chèque", () => {
    const expected = generateExpectedPayments({
      amountToPayCents: 10_000,
      paymentMethod: "cheque",
      paymentInstallments: 2,
    });
    expect(expected[0].label).toBe("Chèque 1/2");
    expect(expected[0].method).toBe("cheque");
  });

  it("ne génère rien pour chèques vacances ou autre", () => {
    expect(
      generateExpectedPayments({
        amountToPayCents: 5000,
        paymentMethod: "holiday_vouchers",
        paymentInstallments: 1,
      })
    ).toEqual([]);
  });
});
