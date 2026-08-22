import {
  classifyClubChampionshipEpreuve,
  getMatchEpreuve,
  isParisEpreuve,
  isTrackedClubChampionshipEpreuve,
  resolveIdEpreuveFromEquipes,
} from "./epreuve-utils";

describe("classifyClubChampionshipEpreuve", () => {
  it("keeps previous-season numeric IDs", () => {
    expect(classifyClubChampionshipEpreuve({ idEpreuve: 15954 })).toBe(
      "championnat_equipes"
    );
    expect(classifyClubChampionshipEpreuve({ idEpreuve: 15955 })).toBe(
      "championnat_equipes"
    );
    expect(classifyClubChampionshipEpreuve({ idEpreuve: 15980 })).toBe(
      "championnat_paris"
    );
  });

  it("recognizes 2026-2027 France IDs and FED_ labels", () => {
    expect(classifyClubChampionshipEpreuve({ idEpreuve: 18368 })).toBe(
      "championnat_equipes"
    );
    expect(classifyClubChampionshipEpreuve({ idEpreuve: 18369 })).toBe(
      "championnat_equipes"
    );
    expect(
      isTrackedClubChampionshipEpreuve({
        idEpreuve: 19999,
        libelleEpreuve: "FED_Championnat de France par Equipes Masculin",
      })
    ).toBe(true);
    expect(
      isTrackedClubChampionshipEpreuve({
        idEpreuve: 19998,
        libelleEpreuve: "FED_Championnat de France par Equipes Féminin",
      })
    ).toBe(true);
  });

  it("ignores other FFTT competitions", () => {
    expect(
      isTrackedClubChampionshipEpreuve({
        idEpreuve: 17000,
        libelleEpreuve: "FED_Critérium fédéral",
      })
    ).toBe(false);
    expect(
      isTrackedClubChampionshipEpreuve({
        idEpreuve: 17001,
        libelleEpreuve: "Championnat de France individuel",
      })
    ).toBe(false);
  });
});

describe("getMatchEpreuve", () => {
  it("classifies a new-season match by id even without a label", () => {
    expect(getMatchEpreuve({ idEpreuve: 18368 })).toBe("championnat_equipes");
  });

  it("classifies from the stored team label", () => {
    expect(
      getMatchEpreuve(
        {},
        { epreuve: "FED_Championnat de France par Equipes Masculin" }
      )
    ).toBe("championnat_equipes");
  });
});

describe("isParisEpreuve", () => {
  it("detects Paris from type or label", () => {
    expect(isParisEpreuve("championnat_paris")).toBe(true);
    expect(isParisEpreuve("Championnat de Paris IDF (Excellence)")).toBe(true);
    expect(isParisEpreuve("FED_Championnat de France par Equipes Masculin")).toBe(
      false
    );
  });
});

describe("resolveIdEpreuveFromEquipes", () => {
  const equipes = [
    {
      team: { idEpreuve: 18368, epreuve: "FED_Championnat de France par Equipes Masculin" },
      matches: [{ isFemale: false }],
    },
    {
      team: { idEpreuve: 18369, epreuve: "FED_Championnat de France par Equipes Féminin" },
      matches: [{ isFemale: true }],
    },
  ];

  it("picks the current France epreuve id by gender", () => {
    expect(resolveIdEpreuveFromEquipes(equipes, "masculin", "championnat_equipes")).toBe(
      18368
    );
    expect(resolveIdEpreuveFromEquipes(equipes, "feminin", "championnat_equipes")).toBe(
      18369
    );
  });
});
