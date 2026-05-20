import { calculateQuote } from "./calculate-quote";
import type { PricingContext } from "./types";
import {
  assertStripeLinesMatchQuote,
  buildStripeCheckoutLineItems,
  sumStripeCheckoutLineItems,
} from "./stripe-checkout-lines";

function ctx(patch: Partial<PricingContext> & Pick<PricingContext, "birthDate">): PricingContext {
  return {
    mainSectionId: "voisins",
    wantsCompetitorExtras: false,
    competitionIds: [],
    familyRegistrationOrder: "none",
    sex: "male",
    pricingDate: "2025-09-01",
    ...patch,
  };
}

describe("buildStripeCheckoutLineItems", () => {
  it("agrège les remises dans l'adhésion nette", () => {
    const quote = calculateQuote(
      ctx({
        birthDate: "2014-06-01",
        familyRegistrationOrder: "second",
        sex: "female",
        firstFemaleRegistrationSqy: true,
      })
    );
    const items = buildStripeCheckoutLineItems(quote);
    expect(items.find((i) => i.name === "Adhésion club")?.amountCents).toBe(
      16_000 - 1_500 - 8_000
    );
    expect(sumStripeCheckoutLineItems(items)).toBe(quote.totalCents);
    expect(() => assertStripeLinesMatchQuote(quote, items)).not.toThrow();
  });

  it("expose licence et compétitions en lignes séparées", () => {
    const quote = calculateQuote(
      ctx({
        birthDate: "2005-01-01",
        competitionIds: ["championnat_paris"],
      })
    );
    const items = buildStripeCheckoutLineItems(quote);
    expect(items.some((i) => i.name === "Licence FFTT")).toBe(true);
    expect(items.some((i) => i.name === "Championnat de Paris")).toBe(true);
    expect(sumStripeCheckoutLineItems(items)).toBe(quote.totalCents);
  });
});
