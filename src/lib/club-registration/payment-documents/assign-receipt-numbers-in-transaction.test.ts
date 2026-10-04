import { classifyOtherReceivedMethod } from "@/lib/accounting-export/chart";

describe("classifyOtherReceivedMethod (prévention saisie)", () => {
  it("détecte une remise déguisée en encaissement", () => {
    expect(
      classifyOtherReceivedMethod({
        label: "Remise trop perçu",
        note: null,
      })
    ).toBe("non_settlement");
  });

  it("priorise SumUp sur une note trop-perçu", () => {
    expect(
      classifyOtherReceivedMethod({
        label: "SUM UP",
        note: "trop perçu régularisé",
      })
    ).toBe("sumup");
  });

  it("détecte un virement", () => {
    expect(
      classifyOtherReceivedMethod({
        label: "Vir bancaire",
        note: undefined,
      })
    ).toBe("transfer");
  });
});
