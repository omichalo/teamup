import {
  isCurrentSeasonTeam,
  selectCurrentSeasonTeams,
  selectLatestEpreuveGenerations,
} from "./team-listing";

describe("isCurrentSeasonTeam", () => {
  const seasonStart = new Date(2025, 8, 1, 12, 0, 0);

  it("keeps only FFTT-listed teams once the flag exists", () => {
    expect(
      isCurrentSeasonTeam({
        listedInFftt: true,
        anyTeamListedInFftt: true,
      })
    ).toBe(true);
    expect(
      isCurrentSeasonTeam({
        listedInFftt: false,
        anyTeamListedInFftt: true,
        updatedAt: new Date(),
        seasonStart,
      })
    ).toBe(false);
    expect(
      isCurrentSeasonTeam({
        listedInFftt: undefined,
        anyTeamListedInFftt: true,
        seasonStart,
      })
    ).toBe(false);
  });

  it("hides stale teams before the first listedInFftt sync", () => {
    expect(
      isCurrentSeasonTeam({
        listedInFftt: undefined,
        anyTeamListedInFftt: false,
        updatedAt: new Date(2025, 5, 15),
        seasonStart,
      })
    ).toBe(false);
    expect(
      isCurrentSeasonTeam({
        listedInFftt: undefined,
        anyTeamListedInFftt: false,
        updatedAt: new Date(2025, 9, 2),
        seasonStart,
      })
    ).toBe(true);
  });
});

describe("selectCurrentSeasonTeams", () => {
  const seasonStart = new Date(2026, 8, 1, 12, 0, 0);

  it("does not empty the list when no team is listed and all look stale", () => {
    const teams = [
      { id: "old", listedInFftt: undefined, updatedAt: new Date(2025, 5, 1) },
    ];
    expect(
      selectCurrentSeasonTeams(teams, (team) => team, seasonStart)
    ).toEqual(teams);
  });
});

describe("selectLatestEpreuveGenerations", () => {
  it("drops last year's France epreuve IDs when the new season is present", () => {
    const now = new Date("2026-08-22T16:26:00Z");
    const lastYear = new Date("2026-05-01T10:00:00Z");
    const teams = [
      {
        id: "old-m",
        epreuveType: "championnat_equipes",
        idEpreuve: 15954,
        updatedAt: lastYear,
      },
      {
        id: "new-m",
        epreuveType: "championnat_equipes",
        idEpreuve: 18368,
        updatedAt: now,
      },
      {
        id: "new-f",
        epreuveType: "championnat_equipes",
        idEpreuve: 18369,
        updatedAt: now,
      },
      {
        id: "paris",
        epreuveType: "championnat_paris",
        idEpreuve: 15980,
        updatedAt: lastYear,
      },
    ];
    expect(
      selectLatestEpreuveGenerations(teams, (team) => team).map((team) => team.id)
    ).toEqual(["new-m", "new-f", "paris"]);
  });

  it("keeps a single epreuve generation unchanged", () => {
    const teams = [
      {
        id: "a",
        epreuveType: "championnat_equipes",
        idEpreuve: 15954,
        updatedAt: new Date("2026-03-01"),
      },
    ];
    expect(selectLatestEpreuveGenerations(teams, (team) => team)).toEqual(teams);
  });
});
