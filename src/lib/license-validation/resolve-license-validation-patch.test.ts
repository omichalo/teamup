import {
  getLicenseValidationInputError,
  isValidFfttLicenseNumber,
  parseOptionalFfttLicenseInput,
} from "./resolve-license-validation-patch";

describe("FFTT license number validation", () => {
  it("accepts license numbers from 4 to 12 digits", () => {
    expect(isValidFfttLicenseNumber("1234")).toBe(true);
    expect(isValidFfttLicenseNumber("7885")).toBe(true);
    expect(isValidFfttLicenseNumber("0001")).toBe(true);
    expect(isValidFfttLicenseNumber("123456789012")).toBe(true);
  });

  it("rejects license numbers shorter than 4 or longer than 12 digits", () => {
    expect(isValidFfttLicenseNumber("123")).toBe(false);
    expect(isValidFfttLicenseNumber("1234567890123")).toBe(false);
  });

  it("distinguishes missing and invalid licences in the form", () => {
    expect(getLicenseValidationInputError("", "done")).toMatch(/obligatoire/);
    expect(getLicenseValidationInputError("", "validated_without_sport")).toMatch(/obligatoire/);
    expect(getLicenseValidationInputError("", "to_do")).toBeNull();
    expect(getLicenseValidationInputError("7885", "done")).toBeNull();
    expect(getLicenseValidationInputError("7885", "validated_without_sport")).toBeNull();
    expect(getLicenseValidationInputError("0001", "done")).toBeNull();
    expect(getLicenseValidationInputError("123", "done")).toMatch(/4 et 12 chiffres/);
    expect(getLicenseValidationInputError("1234567890123", "to_do")).toMatch(/4 et 12 chiffres/);
  });

  it("normalizes a 4-digit license input", () => {
    expect(parseOptionalFfttLicenseInput("12 34")).toEqual({
      ok: true,
      license: "1234",
    });
  });
});
