import {
  isValidFfttLicenseNumber,
  parseOptionalFfttLicenseInput,
} from "./resolve-license-validation-patch";

describe("FFTT license number validation", () => {
  it("accepts license numbers from 4 to 12 digits", () => {
    expect(isValidFfttLicenseNumber("1234")).toBe(true);
    expect(isValidFfttLicenseNumber("123456789012")).toBe(true);
  });

  it("rejects license numbers shorter than 4 or longer than 12 digits", () => {
    expect(isValidFfttLicenseNumber("123")).toBe(false);
    expect(isValidFfttLicenseNumber("1234567890123")).toBe(false);
  });

  it("normalizes a 4-digit license input", () => {
    expect(parseOptionalFfttLicenseInput("12 34")).toEqual({
      ok: true,
      license: "1234",
    });
  });
});
