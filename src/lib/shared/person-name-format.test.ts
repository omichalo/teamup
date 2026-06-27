import { describe, expect, it } from "@jest/globals";
import {
  formatLastNameForDisplay,
  formatPersonDisplayName,
  normalizeLastName,
  normalizeLastNameOnInput,
  normalizeRegistrationLastNamePatch,
} from "./person-name-format";

describe("person-name-format", () => {
  it("normalise un nom en majuscules", () => {
    expect(normalizeLastName("  dupont  ")).toBe("DUPONT");
    expect(normalizeLastNameOnInput("martin-durand")).toBe("MARTIN-DURAND");
  });

  it("formate l'affichage Prénom NOM", () => {
    expect(formatPersonDisplayName("Lucas", "driencourt")).toBe("Lucas DRIENCOURT");
    expect(formatLastNameForDisplay(null)).toBe("");
  });

  it("normalise les noms dans un patch dossier", () => {
    expect(
      normalizeRegistrationLastNamePatch({
        lastName: "dupont",
        representatives: [{ firstName: "Marie", lastName: "martin" }],
        ffttLicenseLookup: { nom: "durand", licence: "12345" },
      })
    ).toEqual({
      lastName: "DUPONT",
      representatives: [{ firstName: "Marie", lastName: "MARTIN" }],
      ffttLicenseLookup: { nom: "DURAND", licence: "12345" },
    });
  });
});
