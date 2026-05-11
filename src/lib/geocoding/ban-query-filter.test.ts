import { filterBanFeaturesByQuery, meaningfulQueryTokens } from "./ban-query-filter";
import type { BanFeature } from "./ban";

function feat(label: string, score: number): BanFeature {
  return {
    type: "Feature",
    properties: {
      label,
      score,
      postcode: "75000",
      city: "Paris",
    },
  };
}

describe("meaningfulQueryTokens", () => {
  it("extrait mail et the depuis thé", () => {
    expect(meaningfulQueryTokens("1 mail thé").sort()).toEqual(["mail", "the"].sort());
  });
});

describe("filterBanFeaturesByQuery", () => {
  it("priorise une voie dont un mot commence par le segment (Thérèse avant Barthelemy)", () => {
    const q = "1 mail the";
    const features: BanFeature[] = [
      feat("1 Mail Barthelemy Thimonnier 77185 Lognes", 0.95),
      feat("1 Mail Thérèse Desqueyroux 78280 Guyancourt", 0.88),
    ];
    const out = filterBanFeaturesByQuery(q, features);
    expect(out.length).toBeGreaterThanOrEqual(2);
    expect(out[0]?.properties.label).toContain("Thérèse");
  });

  it("exclut une rue qui ne contient pas tous les segments", () => {
    const q = "1 mail thér";
    const features: BanFeature[] = [
      feat("1 Mail Thérèse Desqueyroux 78280 Guyancourt", 0.9),
      feat("1 Mail des Tertres 92220 Bagneux", 0.85),
    ];
    const out = filterBanFeaturesByQuery(q, features);
    expect(out).toHaveLength(1);
    expect(out[0]?.properties.label).toContain("Thérèse");
  });
});
