import {
  hasPlayedParisChampionship,
  hasPlayedTeamChampionship,
  isUnregisteredPlayPaymentStatus,
  paymentStatusFieldForCompetition,
  readUnregisteredPlayPaymentStatus,
} from "./unregistered-play-follow-up";

describe("unregistered-play-follow-up", () => {
  it("detects team play from flag or match counts", () => {
    expect(hasPlayedTeamChampionship({ hasPlayedAtLeastOneMatch: true })).toBe(
      true
    );
    expect(
      hasPlayedTeamChampionship({
        masculineMatchesByTeamByPhase: { aller: { "1": 1 } },
      })
    ).toBe(true);
    expect(
      hasPlayedTeamChampionship({
        feminineMatchesByTeamByPhase: { retour: { "2": 0 } },
      })
    ).toBe(false);
  });

  it("detects Paris play from flag or match counts", () => {
    expect(
      hasPlayedParisChampionship({ hasPlayedAtLeastOneMatchParis: true })
    ).toBe(true);
    expect(
      hasPlayedParisChampionship({
        matchesByTeamByPhaseParis: { aller: { "3": 2 } },
      })
    ).toBe(true);
    expect(hasPlayedParisChampionship({})).toBe(false);
  });

  it("maps competition to roster field and validates statuses", () => {
    expect(paymentStatusFieldForCompetition("equipe")).toBe(
      "unregisteredEquipePaymentStatus"
    );
    expect(paymentStatusFieldForCompetition("paris")).toBe(
      "unregisteredParisPaymentStatus"
    );
    expect(isUnregisteredPlayPaymentStatus("paid")).toBe(true);
    expect(isUnregisteredPlayPaymentStatus("other")).toBe(false);
    expect(readUnregisteredPlayPaymentStatus("requested")).toBe("requested");
    expect(readUnregisteredPlayPaymentStatus(undefined)).toBeNull();
  });
});
