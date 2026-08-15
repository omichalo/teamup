import {
  EXCEPTIONAL_DISCOUNT_AID_LABEL,
  EXCEPTIONAL_DISCOUNT_AID_TYPE,
  exceptionalDiscountAidLabel,
  findExceptionalDiscountAid,
  removeExceptionalDiscountAid,
  upsertExceptionalDiscountAid,
} from "./exceptional-discount";
import type { PaymentAid } from "./types";

describe("exceptional-discount", () => {
  it("étiquette la remise exceptionnelle", () => {
    expect(exceptionalDiscountAidLabel(EXCEPTIONAL_DISCOUNT_AID_TYPE)).toBe(
      EXCEPTIONAL_DISCOUNT_AID_LABEL
    );
    expect(exceptionalDiscountAidLabel("pass_sport", "Pass Sport")).toBe("Pass Sport");
  });

  it("upsert une remise avec montant et motif", () => {
    const next = upsertExceptionalDiscountAid([], {
      amountCents: 1_500,
      note: "Cas social",
    });
    expect(next).toEqual([
      {
        type: EXCEPTIONAL_DISCOUNT_AID_TYPE,
        label: EXCEPTIONAL_DISCOUNT_AID_LABEL,
        amountCents: 1_500,
        note: "Cas social",
      },
    ]);
  });

  it("conserve un espace final dans le motif (saisie en cours)", () => {
    const next = upsertExceptionalDiscountAid([], {
      amountCents: 1_500,
      note: "Cas ",
    });
    expect(next[0]?.note).toBe("Cas ");
  });

  it("retrouve et retire la remise", () => {
    const aids: PaymentAid[] = [
      { type: "pass_sport", label: "Pass Sport", amountCents: 5_000 },
      {
        type: EXCEPTIONAL_DISCOUNT_AID_TYPE,
        label: EXCEPTIONAL_DISCOUNT_AID_LABEL,
        amountCents: 1_000,
        note: "Geste",
      },
    ];
    expect(findExceptionalDiscountAid(aids)?.amountCents).toBe(1_000);
    expect(removeExceptionalDiscountAid(aids)).toEqual([
      { type: "pass_sport", label: "Pass Sport", amountCents: 5_000 },
    ]);
  });
});
