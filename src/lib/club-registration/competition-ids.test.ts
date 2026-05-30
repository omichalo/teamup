import {
  COMPETITIONS_JEUNES_ID,
  expandCompetitionIdsForForm,
  normalizeCompetitionIds,
} from "./competition-ids";

describe("expandCompetitionIdsForForm", () => {
  it("déplie competitions_jeunes vers les deux options formulaire", () => {
    expect(expandCompetitionIdsForForm([COMPETITIONS_JEUNES_ID])).toEqual([
      "championnat_jeunes",
      "criterium_federal_jeunes",
    ]);
  });

  it("conserve les ids jeunes individuels", () => {
    expect(
      expandCompetitionIdsForForm(["championnat_jeunes", "criterium_federal_jeunes"])
    ).toEqual(["championnat_jeunes", "criterium_federal_jeunes"]);
  });
});

describe("normalizeCompetitionIds", () => {
  it("fusionne les deux ids jeunes historiques en un seul", () => {
    expect(
      normalizeCompetitionIds(["championnat_jeunes", "criterium_federal_jeunes"])
    ).toEqual([COMPETITIONS_JEUNES_ID]);
  });

  it("ne facture qu'une fois competitions_jeunes si déjà canonique", () => {
    expect(normalizeCompetitionIds([COMPETITIONS_JEUNES_ID])).toEqual([
      COMPETITIONS_JEUNES_ID,
    ]);
  });

  it("conserve les autres compétitions", () => {
    expect(
      normalizeCompetitionIds([
        "championnat_jeunes",
        "criterium_federal_seniors",
        "championnat_paris",
      ])
    ).toEqual([COMPETITIONS_JEUNES_ID, "criterium_federal_seniors", "championnat_paris"]);
  });
});
