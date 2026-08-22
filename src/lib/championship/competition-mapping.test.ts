import {
  flagsFromCompetitionIds,
  hasChampionshipCompetitionIntent,
} from "./competition-mapping";

describe("flagsFromCompetitionIds", () => {
  it("maps equipe and paris independently", () => {
    expect(
      flagsFromCompetitionIds(["championnat_equipe", "criterium_federal_seniors"])
    ).toEqual({ championnat: true, championnatParis: false });
    expect(flagsFromCompetitionIds(["championnat_paris"])).toEqual({
      championnat: false,
      championnatParis: true,
    });
  });

  it("ignores youth competitions for the equipes pool", () => {
    expect(
      hasChampionshipCompetitionIntent(["championnat_jeunes", "criterium_federal_jeunes"])
    ).toBe(false);
  });
});
