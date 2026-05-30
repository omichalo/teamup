import {
  buildSupplementalBanQuery,
  mergeBanFeaturesPreferHigherScore,
} from "./ban-supplemental-query";
import type { BanFeature } from "./ban";

describe("buildSupplementalBanQuery", () => {
  it("étend « the » final en « ther »", () => {
    expect(buildSupplementalBanQuery("1 mail the")).toBe("1 mail ther");
    expect(buildSupplementalBanQuery("  1 mail the  ")).toBe("1 mail ther");
  });

  it("étend « thé » final en « ther »", () => {
    expect(buildSupplementalBanQuery("1 mail thé")).toBe("1 mail ther");
  });

  it("ne change pas si pas de motif", () => {
    expect(buildSupplementalBanQuery("1 mail ther")).toBeNull();
    expect(buildSupplementalBanQuery("rue de paris")).toBeNull();
  });
});

describe("mergeBanFeaturesPreferHigherScore", () => {
  const f = (id: string, label: string, score: number): BanFeature => ({
    type: "Feature",
    properties: { id, label, score },
  });

  it("dédoublonne par id et garde le meilleur score", () => {
    const a = [f("a", "x", 0.5)];
    const b = [f("a", "x", 0.9)];
    const m = mergeBanFeaturesPreferHigherScore(a, b);
    expect(m).toHaveLength(1);
    expect(m[0]?.properties.score).toBe(0.9);
  });

  it("fusionne deux listes distinctes", () => {
    const a = [f("1", "a", 1)];
    const b = [f("2", "b", 0.5)];
    const m = mergeBanFeaturesPreferHigherScore(a, b);
    expect(m.map((x) => x.properties.id).sort()).toEqual(["1", "2"]);
  });
});
