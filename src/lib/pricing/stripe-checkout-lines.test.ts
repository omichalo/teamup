import { calculateQuote } from "./calculate-quote";
import type { PricingContext } from "./types";
import {
  assertStripeLinesMatchQuote,
  buildStripeCheckoutLineItems,
  buildStripeInvoiceCustomFields,
  sumStripeCheckoutLineItems,
} from "./stripe-checkout-lines";

function ctx(patch: Partial<PricingContext> & Pick<PricingContext, "birthDate">): PricingContext {
  return {
    mainSectionId: "voisins",
    wantsCompetitorExtras: false,
    wantsOptionalJersey: false,
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
    const membership = items.find((i) => i.name.includes("Adhésion club"));
    expect(membership?.amountCents).toBe(16_000 - 1_500 - 8_000);
    expect(membership?.name).toBe("Adhésion club (net après remises)");
    expect(membership?.description).toContain("160,00");
    expect(membership?.description).toContain("montant facturé");
    expect(sumStripeCheckoutLineItems(items)).toBe(quote.totalCents);
    expect(() => assertStripeLinesMatchQuote(quote, items)).not.toThrow();
  });

  it("ajoute un champ personnalisé facture pour les remises", () => {
    const quote = calculateQuote(
      ctx({ birthDate: "2014-06-01", familyRegistrationOrder: "second" })
    );
    const fields = buildStripeInvoiceCustomFields(quote);
    expect(fields).toHaveLength(1);
    expect(fields[0]?.name).toBe("Remises sur adhésion");
    expect(fields[0]?.value).toContain("15,00");
  });

  it("expose licence et compétitions en lignes séparées", () => {
    const quote = calculateQuote(
      ctx({
        birthDate: "2005-01-01",
        competitionIds: ["championnat_paris"],
      })
    );
    const items = buildStripeCheckoutLineItems(quote);
    expect(items.some((i) => i.name === "Licence")).toBe(true);
    expect(items.some((i) => i.name === "Championnat de Paris")).toBe(true);
    expect(sumStripeCheckoutLineItems(items)).toBe(quote.totalCents);
  });
});
