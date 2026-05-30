import {
  sanitizeEurosMonetaryInput,
  upsertPaymentAid,
} from "./payment-draft-helpers";

describe("sanitizeEurosMonetaryInput", () => {
  it("conserve une saisie entière en cours (ex. 10 €)", () => {
    expect(sanitizeEurosMonetaryInput("1")).toBe("1");
    expect(sanitizeEurosMonetaryInput("10")).toBe("10");
    expect(sanitizeEurosMonetaryInput("150")).toBe("150");
  });

  it("limite à deux décimales", () => {
    expect(sanitizeEurosMonetaryInput("12,345")).toBe("12,34");
  });

  it("normalise ,5 en 0,5", () => {
    expect(sanitizeEurosMonetaryInput(",5")).toBe("0,5");
  });
});

describe("upsertPaymentAid retainZero", () => {
  it("conserve une ligne à 0 € quand retainZero est vrai", () => {
    const next = upsertPaymentAid(
      [],
      { type: "pass_plus", label: "Pass Plus", amountCents: 0 },
      { retainZero: true }
    );
    expect(next).toHaveLength(1);
    expect(next[0]?.amountCents).toBe(0);
  });

  it("retire une ligne à 0 € sans retainZero ni note ni référence", () => {
    const next = upsertPaymentAid([], {
      type: "pass_plus",
      label: "Pass Plus",
      amountCents: 0,
    });
    expect(next).toHaveLength(0);
  });
});
