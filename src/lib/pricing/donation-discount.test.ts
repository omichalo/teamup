import { calculateQuote } from "./calculate-quote";
import type { PricingContext } from "./types";
import {
  computeDonationDiscountCents,
  computeInvoiceTotalCents,
  DONATION_DISCOUNT_MAX_CENTS,
  getMembershipNetCents,
  isValidVoluntaryDonationCents,
  resolveDonationPricing,
  VOLUNTARY_DONATION_MIN_CENTS,
} from "./donation-discount";

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

describe("donation-discount", () => {
  it("valide 0 ou ≥ 1 €", () => {
    expect(isValidVoluntaryDonationCents(0)).toBe(true);
    expect(isValidVoluntaryDonationCents(100)).toBe(true);
    expect(isValidVoluntaryDonationCents(50)).toBe(false);
    expect(isValidVoluntaryDonationCents(99)).toBe(false);
    expect(VOLUNTARY_DONATION_MIN_CENTS).toBe(100);
  });

  it("calcule 25 % du don avec plafond 73 €", () => {
    expect(computeDonationDiscountCents(4_000, 16_000)).toBe(1_000);
    expect(computeDonationDiscountCents(40_000, 16_000)).toBe(DONATION_DISCOUNT_MAX_CENTS);
    expect(computeDonationDiscountCents(40_000, 5_000)).toBe(5_000);
  });

  it("résout le total facture catalogue + don − remise", () => {
    const quote = calculateQuote(ctx({ birthDate: "2014-06-01" }));
    const membershipNet = getMembershipNetCents(quote);
    expect(membershipNet).toBeGreaterThan(0);

    const breakdown = resolveDonationPricing(quote, 10_000);
    expect(breakdown.donationDiscountCents).toBe(2_500);
    expect(breakdown.invoiceTotalCents).toBe(
      computeInvoiceTotalCents(quote.totalCents, 10_000, membershipNet)
    );
    expect(breakdown.invoiceTotalCents).toBe(quote.totalCents + 10_000 - 2_500);
  });

  it("sans don, le total facture égale le devis", () => {
    const quote = calculateQuote(ctx({ birthDate: "2005-01-01" }));
    const breakdown = resolveDonationPricing(quote, 0);
    expect(breakdown.donationDiscountCents).toBe(0);
    expect(breakdown.invoiceTotalCents).toBe(quote.totalCents);
  });
});
