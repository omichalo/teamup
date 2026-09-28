import { isValidFfttLicenseNumber } from "./license-number";

describe("FFTT licence number", () => {
  it("accepts four-digit numbers and preserves leading zeros", () => {
    expect(isValidFfttLicenseNumber("7885")).toBe(true);
    expect(isValidFfttLicenseNumber("0001")).toBe(true);
  });
  it("rejects too short and too long numbers", () => {
    expect(isValidFfttLicenseNumber("123")).toBe(false);
    expect(isValidFfttLicenseNumber("1234567890123")).toBe(false);
  });
});
