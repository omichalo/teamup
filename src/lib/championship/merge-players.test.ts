import { mergePlayersWithChampionshipRoster } from "./merge-players";
import type { ChampionshipRosterView } from "./merge-players";
import type { Player } from "@/types/team-management";

function player(partial: Partial<Player> & Pick<Player, "id" | "name" | "firstName">): Player {
  return {
    license: partial.id,
    typeLicence: "T",
    gender: "M",
    nationality: "FR",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    preferredTeams: { masculine: [], feminine: [] },
    participation: { championnat: true, championnatParis: false },
    ...partial,
  };
}

function roster(
  partial: Partial<ChampionshipRosterView> & Pick<ChampionshipRosterView, "id" | "personKey">
): ChampionshipRosterView {
  return {
    seasonLabel: "2026-2027",
    registrationId: null,
    ffttLicense: partial.id,
    firstName: "A",
    lastName: "B",
    includedFromDossier: true,
    coachIncluded: false,
    coachExcluded: false,
    championnat: true,
    championnatParis: false,
    paymentStatus: "paid",
    registrationStatus: "paid",
    licensePresence: "in_club_list",
    licenseValidationStatus: null,
    preferredTeams: { masculine: [], feminine: [] },
    isTemporary: false,
    discordMentions: [],
    isWheelchair: false,
    ...partial,
  };
}

describe("mergePlayersWithChampionshipRoster", () => {
  it("hides leftover players who moved to another club", () => {
    const merged = mergePlayersWithChampionshipRoster(
      [
        player({
          id: "7859322",
          name: "LECHEMINANT",
          firstName: "Claude",
          listedInClub: false,
          nomClub: "CHESNAY 78 AS",
          typeLicence: "T",
        }),
      ],
      []
    );
    expect(merged).toHaveLength(0);
  });

  it("hides a roster entry whose FFTT licence is now at another club", () => {
    const merged = mergePlayersWithChampionshipRoster(
      [
        player({
          id: "7859322",
          name: "LECHEMINANT",
          firstName: "Claude",
          listedInClub: false,
          nomClub: "CHESNAY 78 AS",
        }),
      ],
      [
        roster({
          id: "7859322",
          personKey: "7859322",
          licensePresence: "other_club",
        }),
      ]
    );
    expect(merged).toHaveLength(0);
  });

  it("keeps leftover SQY affiliates without a season licence", () => {
    const merged = mergePlayersWithChampionshipRoster(
      [
        player({
          id: "5984668",
          name: "NEMACIUC",
          firstName: "Mihai",
          listedInClub: true,
          nomClub: "SQY PING",
          typeLicence: "",
        }),
      ],
      []
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].championshipAlerts).toEqual(["fftt_sqy_unlicensed"]);
  });

  it("clears last-season participation when the player is absent from the roster", () => {
    const merged = mergePlayersWithChampionshipRoster(
      [player({ id: "111", name: "OLD", firstName: "Ghost" })],
      []
    );
    expect(merged[0].participation.championnat).toBe(false);
  });

  it("adds a dossier-only competitor missing from players", () => {
    const merged = mergePlayersWithChampionshipRoster(
      [],
      [
        roster({
          id: "reg_abc",
          personKey: "reg_abc",
          ffttLicense: null,
          firstName: "Laurent",
          lastName: "DESHAYES",
          licensePresence: "none",
          paymentStatus: "pending",
        }),
      ]
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe("reg_abc");
    expect(merged[0].championshipAlerts).toEqual(["unpaid", "no_license"]);
  });

  it("does not treat a roster in_club_list flag as a current FFTT licence", () => {
    const merged = mergePlayersWithChampionshipRoster(
      [player({ id: "111", name: "A", firstName: "B", listedInClub: false })],
      [roster({ id: "111", personKey: "111", licensePresence: "in_club_list" })]
    );
    expect(merged[0].listedInClub).toBe(false);
    expect(merged[0].participation.championnat).toBe(true);
    expect(merged[0].typeLicence).toBe("");
    expect(merged[0].isActive).toBe(false);
  });

  it("hides last-season licence types when the player is off the club list", () => {
    const leftover = mergePlayersWithChampionshipRoster(
      [
        player({
          id: "111",
          name: "OLD",
          firstName: "Ghost",
          listedInClub: false,
          typeLicence: "T",
          isActive: true,
        }),
      ],
      []
    );
    expect(leftover[0].isActive).toBe(false);
    expect(leftover[0].typeLicence).toBe("");

    const onRoster = mergePlayersWithChampionshipRoster(
      [
        player({
          id: "111",
          name: "OLD",
          firstName: "Ghost",
          listedInClub: false,
          typeLicence: "T",
          isActive: true,
        }),
      ],
      [roster({ id: "111", personKey: "111", licensePresence: "unknown" })]
    );
    expect(onRoster[0].isActive).toBe(false);
    expect(onRoster[0].typeLicence).toBe("");
  });

  it("does not keep last-season burnout from the FFTT player mirror", () => {
    const lastSeasonBurnout = { aller: 4, retour: 6 };
    const withoutRoster = mergePlayersWithChampionshipRoster(
      [
        player({
          id: "111",
          name: "OLD",
          firstName: "Ghost",
          highestMasculineTeamNumberByPhase: lastSeasonBurnout,
          hasPlayedAtLeastOneMatch: true,
        }),
      ],
      []
    );
    expect(withoutRoster[0].highestMasculineTeamNumberByPhase).toBeUndefined();
    expect(withoutRoster[0].hasPlayedAtLeastOneMatch).toBe(false);

    const onRoster = mergePlayersWithChampionshipRoster(
      [
        player({
          id: "111",
          name: "A",
          firstName: "B",
          highestMasculineTeamNumberByPhase: lastSeasonBurnout,
          hasPlayedAtLeastOneMatch: true,
        }),
      ],
      [roster({ id: "111", personKey: "111" })]
    );
    expect(onRoster[0].highestMasculineTeamNumberByPhase).toBeUndefined();
    expect(onRoster[0].hasPlayedAtLeastOneMatch).toBe(false);
  });
});
