import { rosterDocIdsWithSeasonalMatchStats } from "./roster-match-stats";

describe("rosterDocIdsWithSeasonalMatchStats", () => {
  it("collects roster docs that still carry last-season burnout", () => {
    expect(
      rosterDocIdsWithSeasonalMatchStats([
        { id: "clean", ffttLicense: "1" },
        {
          id: "burned",
          ffttLicense: "2222",
          highestMasculineTeamNumberByPhase: { aller: 3 },
        },
        { id: "played", hasPlayedAtLeastOneMatch: true },
      ])
    ).toEqual(["burned", "2222", "played"]);
  });
});
