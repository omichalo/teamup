import {
  getAvailabilityDocumentId,
  getLegacyAvailabilityDocumentId,
  stripSeasonPrefixFromAvailabilityDocId,
} from "./document-id";

describe("getAvailabilityDocumentId", () => {
  it("préfixe la saison", () => {
    expect(
      getAvailabilityDocumentId("2026-2027", 5, "aller", "masculin")
    ).toBe("2026-2027_aller_5_masculin");
    expect(
      getAvailabilityDocumentId("2026-2027", 1, "aller", "masculin", 15980)
    ).toBe("2026-2027_aller_1_masculin_15980");
  });

  it("rejette un libellé invalide", () => {
    expect(() =>
      getAvailabilityDocumentId("aller", 1, "aller", "masculin")
    ).toThrow(/invalide/);
  });
});

describe("getLegacyAvailabilityDocumentId", () => {
  it("conserve le format historique", () => {
    expect(getLegacyAvailabilityDocumentId(5, "aller", "feminin")).toBe(
      "aller_5_feminin"
    );
  });
});

describe("stripSeasonPrefixFromAvailabilityDocId", () => {
  it("détecte le préfixe saison", () => {
    expect(
      stripSeasonPrefixFromAvailabilityDocId("2026-2027_aller_5_masculin")
    ).toEqual({ seasonLabel: "2026-2027", legacyId: "aller_5_masculin" });
  });

  it("laisse les IDs legacy intacts", () => {
    expect(stripSeasonPrefixFromAvailabilityDocId("aller_5_masculin")).toEqual({
      seasonLabel: null,
      legacyId: "aller_5_masculin",
    });
  });
});
