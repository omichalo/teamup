import {
  wouldCreateOverpayment,
} from "@/lib/club-registration/payment/overpayment";

describe("wouldCreateOverpayment", () => {
  it("détecte un trop-perçu dès que le montant dépasse le reste dû", () => {
    expect(wouldCreateOverpayment(0, 100)).toBe(true);
    expect(wouldCreateOverpayment(500, 501)).toBe(true);
    expect(wouldCreateOverpayment(500, 500)).toBe(false);
    expect(wouldCreateOverpayment(500, 100)).toBe(false);
  });

  it("traite un reste dû négatif comme zéro", () => {
    expect(wouldCreateOverpayment(-10, 1)).toBe(true);
  });
});
