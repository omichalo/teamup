import { isOrphanChampionshipRosterStub } from "./orphan-roster-stub";

describe("isOrphanChampionshipRosterStub", () => {
  const base = {
    championnat: false,
    championnatParis: false,
    coachIncluded: false,
    coachExcluded: false,
    includedFromDossier: false,
    isTemporary: false,
  };

  it("détecte un stub sans intent ni match", () => {
    expect(isOrphanChampionshipRosterStub(base)).toBe(true);
  });

  it("conserve coach / dossier / participation / match", () => {
    expect(isOrphanChampionshipRosterStub({ ...base, coachIncluded: true })).toBe(
      false
    );
    expect(
      isOrphanChampionshipRosterStub({ ...base, includedFromDossier: true })
    ).toBe(false);
    expect(isOrphanChampionshipRosterStub({ ...base, championnat: true })).toBe(
      false
    );
    expect(
      isOrphanChampionshipRosterStub({
        ...base,
        hasPlayedAtLeastOneMatch: true,
      })
    ).toBe(false);
  });
});
