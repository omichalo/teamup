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
    slotIds: [],
    additionalSectionIds: [],
    wantsCompetitorExtras: false,
    wantsOptionalJersey: false,
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
  if (expected.license === 0) {
    expect(license).toBeUndefined();
  } else {
    expect(license?.amountCents).toBe(expected.license);
  }
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

describe("calculateQuoteFromConfig — maillot optionnel", () => {
  it("ajoute une ligne à 35 € hors section compétiteur", () => {
    const quote = calculateQuoteFromConfig(
      ctx({ birthDate: "2005-01-01", wantsOptionalJersey: true }),
      config
    );
    const jersey = quote.lines.find((l) => l.id === "optional_jersey");
    expect(jersey?.amountCents).toBe(3_500);
    expect(quote.totalCents).toBe(22_200 + 3_500);
  });

  it("n'ajoute pas le maillot optionnel en section compétiteur", () => {
    const quote = calculateQuoteFromConfig(
      ctx({
        birthDate: "2005-01-01",
        wantsCompetitorExtras: true,
        wantsOptionalJersey: true,
      }),
      config
    );
    expect(quote.lines.some((l) => l.id === "optional_jersey")).toBe(false);
    expect(quote.lines.some((l) => l.id === "competitor_jersey_info")).toBe(true);
  });
});

describe("calculateQuoteFromConfig — aides admin_review", () => {
  it("marque Pass Sport pour validation secrétariat sans message répété par aide", () => {
    const quote = calculateQuoteFromConfig(
      ctx({ birthDate: "2005-01-01", reductionTypes: ["pass_sport"] }),
      config
    );
    expect(quote.requiresAdminReview).toBe(true);
    expect(quote.warnings).toHaveLength(0);
  });
});

describe("calculateQuoteFromConfig — dispositif CHAMP'YON", () => {
  const champYonCtx = {
    mainSectionId: "trappes",
    slotIds: ["trappes-mer-1730-jeunes-loisir-compet"],
    additionalSectionIds: [] as string[],
  };

  it("applique 105 € sans licence pour moins de 15 ans", () => {
    const quote = calculateQuoteFromConfig(
      ctx({ birthDate: "2014-06-01", ...champYonCtx }),
      config
    );
    expect(quote.appliedPricingDeviceId).toBe("champ-yon");
    expect(quote.segmentLabel).toContain("CHAMP'YON");
    expect(quote.lines.some((line) => line.id === "fftt_license")).toBe(false);
    expectTotals(quote, { membership: 10_500, license: 0, total: 10_500 });
  });

  it("applique 115 € sans licence pour 15 ans et plus", () => {
    const quote = calculateQuoteFromConfig(
      ctx({ birthDate: "2005-01-01", ...champYonCtx }),
      config
    );
    expect(quote.lines.some((line) => line.id === "fftt_license")).toBe(false);
    expectTotals(quote, { membership: 11_500, license: 0, total: 11_500 });
  });

  it("inclut Baby Ping dans la tranche moins de 15 ans", () => {
    const quote = calculateQuoteFromConfig(
      ctx({ birthDate: "2020-01-01", ...champYonCtx }),
      config
    );
    expectTotals(quote, { membership: 10_500, license: 0, total: 10_500 });
  });

  it("n'applique pas les remises famille", () => {
    const quote = calculateQuoteFromConfig(
      ctx({
        birthDate: "2014-06-01",
        ...champYonCtx,
        familyRegistrationOrder: "second",
      }),
      config
    );
    expect(quote.lines.some((line) => line.kind === "discount_family")).toBe(false);
    expect(quote.totalCents).toBe(10_500);
  });

  it("retombe sur la grille classique avec 2 créneaux", () => {
    const quote = calculateQuoteFromConfig(
      ctx({
        birthDate: "2014-06-01",
        mainSectionId: "trappes",
        slotIds: ["trappes-mer-1730-jeunes-loisir-compet", "lv-jeu-1800-jeunes-loisirs"],
        additionalSectionIds: [],
      }),
      config
    );
    expect(quote.appliedPricingDeviceId).toBeUndefined();
    expectTotals(quote, { membership: 16_000, license: 4_500, total: 20_500 });
  });
});
