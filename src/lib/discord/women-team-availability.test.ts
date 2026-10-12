import {
  applyWomenDaySelection,
  buildWomenChampionshipDayUpdate,
  mergeWomenTeamAvailability,
} from "@/lib/discord/women-team-availability";

describe("mergeWomenTeamAvailability", () => {
  it("lit VEN depuis masculin et SAM depuis féminin", () => {
    expect(
      mergeWomenTeamAvailability(
        { available: true, fridayAvailable: true, comment: "ok" },
        { available: false, saturdayAvailable: false }
      )
    ).toEqual({
      fridayAvailable: true,
      saturdayAvailable: false,
      comment: "ok",
    });
  });

  it("ne confond pas les docs (SAM absent du masculin ≠ non renseigné si présent en féminin)", () => {
    const merged = mergeWomenTeamAvailability(
      { available: true, fridayAvailable: true },
      { available: false, saturdayAvailable: false }
    );
    expect(merged.fridayAvailable).toBe(true);
    expect(merged.saturdayAvailable).toBe(false);
  });

  it("fallback sur available si friday/saturday manquants", () => {
    expect(
      mergeWomenTeamAvailability({ available: true }, { available: false })
    ).toEqual({
      fridayAvailable: true,
      saturdayAvailable: false,
    });
  });

  it("retourne undefined pour un jour sans réponse", () => {
    expect(mergeWomenTeamAvailability({ fridayAvailable: true }, null)).toEqual(
      {
        fridayAvailable: true,
      }
    );
  });
});

describe("applyWomenDaySelection", () => {
  it("met à jour uniquement le jour choisi", () => {
    const current = { fridayAvailable: true, saturdayAvailable: false };
    expect(applyWomenDaySelection(current, "ven", false)).toEqual({
      fridayAvailable: false,
      saturdayAvailable: false,
    });
    expect(applyWomenDaySelection(current, "sat", true)).toEqual({
      fridayAvailable: true,
      saturdayAvailable: true,
    });
  });
});

describe("buildWomenChampionshipDayUpdate", () => {
  it("VEN → payload masculin avec fridayAvailable", () => {
    expect(buildWomenChampionshipDayUpdate("ven", true, null)).toEqual({
      available: true,
      fridayAvailable: true,
    });
  });

  it("SAM → payload féminin avec saturdayAvailable", () => {
    expect(buildWomenChampionshipDayUpdate("sat", false, null)).toEqual({
      available: false,
      saturdayAvailable: false,
    });
  });

  it("préserve le commentaire déjà présent sur le doc cible", () => {
    expect(
      buildWomenChampionshipDayUpdate("ven", false, {
        available: true,
        fridayAvailable: true,
        comment: "arrive à 20h",
      })
    ).toEqual({
      available: false,
      fridayAvailable: false,
      comment: "arrive à 20h",
    });
  });

  it("n'écrit jamais saturdayAvailable sur un update VEN", () => {
    const payload = buildWomenChampionshipDayUpdate("ven", true, {
      available: false,
      fridayAvailable: false,
      saturdayAvailable: true,
      comment: "x",
    });
    expect(payload).toEqual({
      available: true,
      fridayAvailable: true,
      comment: "x",
    });
    expect(payload).not.toHaveProperty("saturdayAvailable");
  });
});
