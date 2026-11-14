import {
  buildAvailabilityPollId,
  parseAvailabilityPollId,
} from "./availability-poll-id";

describe("buildAvailabilityPollId", () => {
  it("construit un ID saisonné", () => {
    expect(
      buildAvailabilityPollId({
        seasonLabel: "2026-2027",
        phase: "aller",
        journee: 5,
        championshipType: "masculin",
      })
    ).toBe("2026-2027_aller_5_masculin");
  });

  it("construit un ID legacy sans saison", () => {
    expect(
      buildAvailabilityPollId({
        phase: "aller",
        journee: 5,
        championshipType: "masculin",
      })
    ).toBe("aller_5_masculin");
  });
});

describe("parseAvailabilityPollId", () => {
  it("parse un ID legacy", () => {
    expect(parseAvailabilityPollId("aller_5_masculin")).toEqual({
      seasonLabel: null,
      phase: "aller",
      journee: 5,
      championshipType: "masculin",
    });
  });

  it("parse un ID saisonné avec idEpreuve", () => {
    expect(parseAvailabilityPollId("2026-2027_aller_1_masculin_15980")).toEqual({
      seasonLabel: "2026-2027",
      phase: "aller",
      journee: 1,
      championshipType: "masculin",
      idEpreuve: 15980,
    });
  });

  it("rejette un format invalide", () => {
    expect(parseAvailabilityPollId("foo")).toBeNull();
    expect(parseAvailabilityPollId("2026-2027_foo_1_masculin")).toBeNull();
  });
});
