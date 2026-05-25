import { buildDefaultRegistrationConfig } from "./default-config";
import { calculateQuoteFromConfig } from "./pricing-engine";
import type { PricingContext } from "@/lib/pricing/types";

const config = buildDefaultRegistrationConfig();
const PRICING_DATE = "2025-09-01";

function ctx(
  patch: Partial<PricingContext> & Pick<PricingContext, "birthDate">
): PricingContext {
  return {
    mainSectionId: "voisins",
    wantsCompetitorExtras: false,
    competitionIds: [],
    familyRegistrationOrder: "none",
    sex: "male",
    pricingDate: PRICING_DATE,
    ...patch,
  };
}

function expectTotals(
  quote: ReturnType<typeof calculateQuoteFromConfig>,
  expected: { membership: number; license: number; total: number }
) {
  const membership = quote.lines.find((l) => l.id === "membership");
  const license = quote.lines.find((l) => l.id === "fftt_license");
  expect(membership?.amountCents).toBe(expected.membership);
  expect(license?.amountCents).toBe(expected.license);
  expect(quote.totalCents).toBe(expected.total);
}

describe("calculateQuoteFromConfig — grille loisirs", () => {
  it("Baby Ping : 110 + 45 = 155 €", () => {
    const quote = calculateQuoteFromConfig(ctx({ birthDate: "2020-01-01" }), config);
    expect(quote.segmentLabel).toContain("Baby Ping");
    expectTotals(quote, { membership: 11_000, license: 4_500, total: 15_500 });
  });
});

describe("calculateQuoteFromConfig — remises configurables", () => {
  it("applique la remise famille 2e adhérent", () => {
    const quote = calculateQuoteFromConfig(
      ctx({ birthDate: "2005-01-01", familyRegistrationOrder: "second" }),
      config
    );
    expect(quote.totalCents).toBe(20_700);
  });
});

describe("calculateQuoteFromConfig — bundle compétitions jeunes", () => {
  it("facture une seule ligne jeunes à 25 €", () => {
    const quote = calculateQuoteFromConfig(
      ctx({
        birthDate: "2005-01-01",
        wantsCompetitorExtras: true,
        competitionIds: ["championnat_jeunes", "criterium_federal_jeunes"],
      }),
      config
    );
    const youthLines = quote.lines.filter((l) => l.kind === "competition");
    expect(youthLines).toHaveLength(1);
    expect(youthLines[0]?.amountCents).toBe(2_500);
  });
});

describe("calculateQuoteFromConfig — handisport", () => {
  it("utilise wantsCompetitorExtras comme les autres sections", () => {
    const leisure = calculateQuoteFromConfig(
      ctx({ birthDate: "1990-01-01", mainSectionId: "handisport", wantsCompetitorExtras: false }),
      config
    );
    expectTotals(leisure, { membership: 16_000, license: 3_100, total: 19_100 });

    const compet = calculateQuoteFromConfig(
      ctx({
        birthDate: "2010-01-01",
        mainSectionId: "handisport",
        wantsCompetitorExtras: true,
      }),
      config
    );
    expectTotals(compet, { membership: 17_500, license: 3_000, total: 20_500 });
  });
});

describe("calculateQuoteFromConfig — aides admin_review", () => {
  it("marque Pass Sport pour validation secrétariat", () => {
    const quote = calculateQuoteFromConfig(
      ctx({ birthDate: "2005-01-01", reductionTypes: ["pass_sport"] }),
      config
    );
    expect(quote.requiresAdminReview).toBe(true);
    expect(quote.warnings.some((w) => w.includes("Pass Sport"))).toBe(true);
  });
});
