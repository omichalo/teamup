import { calculateQuote, type PricingContext } from "./index";

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
  quote: ReturnType<typeof calculateQuote>,
  expected: { membership: number; license: number; total: number }
) {
  const membership = quote.lines.find((l) => l.id === "membership");
  const license = quote.lines.find((l) => l.id === "fftt_license");
  expect(membership?.amountCents).toBe(expected.membership);
  expect(license?.amountCents).toBe(expected.license);
  expect(quote.totalCents).toBe(expected.total);
}

describe("calculateQuote — grille loisirs", () => {
  it("Baby Ping : 110 + 45 = 155 €", () => {
    const quote = calculateQuote(ctx({ birthDate: "2020-01-01" }));
    expect(quote.segmentLabel).toContain("Baby Ping");
    expectTotals(quote, { membership: 11_000, license: 4_500, total: 15_500 });
  });

  it("Moins de 15 ans : 160 + 45 = 205 €", () => {
    const quote = calculateQuote(ctx({ birthDate: "2014-06-01" }));
    expect(quote.segmentLabel).toContain("Moins de 15 ans");
    expectTotals(quote, { membership: 16_000, license: 4_500, total: 20_500 });
  });

  it("15 ans et plus : 160 + 62 = 222 €", () => {
    const quote = calculateQuote(ctx({ birthDate: "2005-01-01" }));
    expect(quote.segmentLabel).toContain("15 ans et plus");
    expectTotals(quote, { membership: 16_000, license: 6_200, total: 22_200 });
  });
});

describe("calculateQuote — grille compétiteur", () => {
  it("Baby Ping compétiteur : 125 + 45 = 170 €", () => {
    const quote = calculateQuote(
      ctx({ birthDate: "2020-01-01", wantsCompetitorExtras: true })
    );
    expectTotals(quote, { membership: 12_500, license: 4_500, total: 17_000 });
    expect(quote.lines.some((l) => l.id === "competitor_jersey_info")).toBe(true);
  });

  it("Moins de 15 ans compétiteur : 175 + 45 = 220 €", () => {
    const quote = calculateQuote(
      ctx({ birthDate: "2014-06-01", wantsCompetitorExtras: true })
    );
    expectTotals(quote, { membership: 17_500, license: 4_500, total: 22_000 });
  });

  it("15 ans et plus compétiteur : 175 + 62 = 237 €", () => {
    const quote = calculateQuote(
      ctx({ birthDate: "2005-01-01", wantsCompetitorExtras: true })
    );
    expectTotals(quote, { membership: 17_500, license: 6_200, total: 23_700 });
  });
});

describe("calculateQuote — handisport", () => {
  it("Loisirs : 160 + 32 = 192 €", () => {
    const quote = calculateQuote(
      ctx({
        birthDate: "1990-01-01",
        mainSectionId: "handisport",
        handisportPracticeLevel: "leisure",
      })
    );
    expectTotals(quote, { membership: 16_000, license: 3_200, total: 19_200 });
  });

  it("Compétition moins de 20 ans : 175 + 32 = 207 €", () => {
    const quote = calculateQuote(
      ctx({
        birthDate: "2010-01-01",
        mainSectionId: "handisport",
        handisportPracticeLevel: "competition",
      })
    );
    expectTotals(quote, { membership: 17_500, license: 3_200, total: 20_700 });
  });

  it("Compétition 20 ans et plus : 175 + 70 = 245 €", () => {
    const quote = calculateQuote(
      ctx({
        birthDate: "1990-01-01",
        mainSectionId: "handisport",
        handisportPracticeLevel: "competition",
      })
    );
    expectTotals(quote, { membership: 17_500, license: 7_000, total: 24_500 });
  });

  it("exige le niveau handisport", () => {
    const quote = calculateQuote(
      ctx({ birthDate: "1990-01-01", mainSectionId: "handisport" })
    );
    expect(quote.totalCents).toBe(0);
    expect(quote.requiresAdminReview).toBe(true);
    expect(quote.warnings.some((w) => w.includes("handisport"))).toBe(true);
  });
});

describe("calculateQuote — sport adapté", () => {
  it("Loisirs -21 ans : 210 €", () => {
    const quote = calculateQuote(
      ctx({ birthDate: "2010-01-01", mainSectionId: "sport-adapte" })
    );
    expectTotals(quote, { membership: 16_000, license: 5_000, total: 21_000 });
  });

  it("Compétiteur +21 ans : 225 €", () => {
    const quote = calculateQuote(
      ctx({
        birthDate: "1990-01-01",
        mainSectionId: "sport-adapte",
        wantsCompetitorExtras: true,
      })
    );
    expectTotals(quote, { membership: 17_500, license: 5_000, total: 22_500 });
  });
});

describe("calculateQuote — compétitions", () => {
  it("facture 25 € une seule fois pour les compétitions jeunes (ids historiques)", () => {
    const quote = calculateQuote(
      ctx({
        birthDate: "2005-01-01",
        wantsCompetitorExtras: true,
        competitionIds: ["championnat_jeunes", "criterium_federal_jeunes"],
      })
    );
    const competitionLines = quote.lines.filter((l) => l.kind === "competition");
    expect(competitionLines).toHaveLength(1);
    expect(competitionLines[0]?.label).toBe("Compétitions jeunes");
    expect(competitionLines[0]?.amountCents).toBe(2_500);
  });

  it("ajoute chaque compétition cochée", () => {
    const quote = calculateQuote(
      ctx({
        birthDate: "2005-01-01",
        competitionIds: ["championnat_equipe", "championnat_paris"],
      })
    );
    expect(quote.totalCents).toBe(22_200 + 2_500 + 1_500);
  });

  it("critérium fédéral seniors : 42 €", () => {
    const quote = calculateQuote(
      ctx({
        birthDate: "1970-01-01",
        competitionIds: ["criterium_federal_seniors"],
      })
    );
    expect(quote.lines.find((l) => l.id === "competition_criterium_federal_seniors")?.amountCents).toBe(
      4_200
    );
  });

  it("ignore handisport à 0 €", () => {
    const quote = calculateQuote(
      ctx({
        birthDate: "2005-01-01",
        competitionIds: ["competition_handisport"],
      })
    );
    expect(quote.lines.some((l) => l.id === "competition_competition_handisport")).toBe(
      false
    );
  });
});

describe("calculateQuote — remises sur adhésion", () => {
  it("2ᵉ membre famille : −15 € sur adhésion", () => {
    const quote = calculateQuote(
      ctx({ birthDate: "2014-06-01", familyRegistrationOrder: "second" })
    );
    expect(quote.totalCents).toBe(20_500 - 1_500);
    expect(quote.lines.find((l) => l.kind === "discount_family")?.amountCents).toBe(
      -1_500
    );
  });

  it("3ᵉ membre et + : −30 € sur adhésion", () => {
    const quote = calculateQuote(
      ctx({ birthDate: "2014-06-01", familyRegistrationOrder: "third_or_more" })
    );
    expect(quote.totalCents).toBe(20_500 - 3_000);
  });

  it("1ʳᵉ inscription féminine : −80 € sur adhésion", () => {
    const quote = calculateQuote(
      ctx({
        birthDate: "2014-06-01",
        sex: "female",
        firstFemaleRegistrationSqy: true,
      })
    );
    expect(quote.totalCents).toBe(20_500 - 8_000);
  });

  it("cumule famille et féminine sur l'adhésion", () => {
    const quote = calculateQuote(
      ctx({
        birthDate: "2014-06-01",
        sex: "female",
        firstFemaleRegistrationSqy: true,
        familyRegistrationOrder: "second",
      })
    );
    expect(quote.totalCents).toBe(20_500 - 1_500 - 8_000);
  });

  it("ne plafonne pas la licence : remise famille ne touche pas la licence", () => {
    const quote = calculateQuote(
      ctx({ birthDate: "2014-06-01", familyRegistrationOrder: "second" })
    );
    expect(quote.lines.find((l) => l.id === "fftt_license")?.amountCents).toBe(4_500);
  });
});

describe("calculateQuote — aides déclarées (V1)", () => {
  it("signale Pass Sport sans montant", () => {
    const quote = calculateQuote(
      ctx({ birthDate: "2014-06-01", reductionTypes: ["pass_sport"] })
    );
    expect(quote.requiresAdminReview).toBe(true);
    expect(quote.warnings.some((w) => w.includes("secrétariat"))).toBe(true);
    expect(quote.totalCents).toBe(20_500);
  });
});

describe("calculateQuote — date invalide", () => {
  it("retourne un devis vide avec avertissement", () => {
    const quote = calculateQuote(ctx({ birthDate: "invalid" }));
    expect(quote.lines).toHaveLength(0);
    expect(quote.requiresAdminReview).toBe(true);
  });
});
