import {
  getCompositionDefaultsDocumentId,
  getCompositionDocumentId,
  getLegacyCompositionDocumentId,
  parseLegacyCompositionDocumentId,
  stripSeasonPrefixFromCompositionDocId,
} from "./document-id";

describe("composition document ids", () => {
  it("namespaces day compositions by season and FFTT epreuve id", () => {
    expect(getCompositionDocumentId("2026-2027", 1, "aller", "masculin")).toBe(
      "2026-2027_aller_1_masculin"
    );
    expect(
      getCompositionDocumentId("2026-2027", 1, "aller", "masculin", 18368)
    ).toBe("2026-2027_aller_1_masculin_18368");
  });

  it("keeps legacy ids without season for migration", () => {
    expect(getLegacyCompositionDocumentId(5, "aller", "feminin")).toBe(
      "aller_5_feminin"
    );
    expect(getLegacyCompositionDocumentId(5, "aller", "masculin", 15980)).toBe(
      "aller_5_masculin_15980"
    );
  });

  it("parses and strips season prefixes", () => {
    expect(parseLegacyCompositionDocumentId("aller_5_masculin")).toEqual({
      phase: "aller",
      journee: 5,
      championshipType: "masculin",
    });
    expect(
      stripSeasonPrefixFromCompositionDocId("2025-2026_aller_5_masculin")
    ).toEqual({
      seasonLabel: "2025-2026",
      legacyId: "aller_5_masculin",
    });
  });

  it("namespaces default compositions by FFTT epreuve id", () => {
    expect(getCompositionDefaultsDocumentId("aller", "feminin")).toBe(
      "aller_feminin"
    );
    expect(getCompositionDefaultsDocumentId("aller", "feminin", 18369)).toBe(
      "aller_feminin_18369"
    );
  });
});
