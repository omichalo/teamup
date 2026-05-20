import {
  COMPETITIONS_JEUNES_ID,
  normalizeCompetitionIds,
} from "./competition-ids";

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
