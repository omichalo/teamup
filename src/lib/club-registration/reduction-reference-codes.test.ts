import {
  getReductionReferenceCode,
  normalizeReductionReferenceCodes,
  preprocessRegistrationPayloadInput,
  setReductionReferenceCode,
  stripUnselectedReductionReferenceCodes,
} from "./reduction-reference-codes";

describe("reduction-reference-codes", () => {
  it("migre passSportCode legacy vers pass_sport", () => {
    expect(normalizeReductionReferenceCodes({}, "ABC123")).toEqual({
      pass_sport: "ABC123",
    });
  });

  it("nettoie les codes des aides non sélectionnées", () => {
    expect(
      stripUnselectedReductionReferenceCodes(
        { pass_sport: "ABC", pass_plus: "XYZ" },
        new Set(["pass_sport"])
      )
    ).toEqual({ pass_sport: "ABC" });
  });

  it("prétraite le payload en fusionnant passSportCode legacy", () => {
    const result = preprocessRegistrationPayloadInput({
      reductionTypes: ["pass_sport"],
      passSportCode: " LEGACY ",
    }) as Record<string, unknown>;
    expect(result.passSportCode).toBeUndefined();
    expect(result.reductionReferenceCodes).toEqual({ pass_sport: "LEGACY" });
  });

  it("met à jour un code par identifiant d'aide", () => {
    expect(
      getReductionReferenceCode(
        setReductionReferenceCode({}, "pass_sport", "XYZ"),
        "pass_sport"
      )
    ).toBe("XYZ");
  });
});
