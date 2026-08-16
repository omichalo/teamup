import {
  readKnownFfttLicenseFromRegistrationData,
  resolveKnownFfttLicenseNumber,
} from "@/lib/license-validation/known-fftt-license";

describe("resolveKnownFfttLicenseNumber", () => {
  it("prefers the stored license over the lookup", () => {
    expect(resolveKnownFfttLicenseNumber("1111111", "2222222")).toBe("1111111");
  });

  it("falls back to the lookup when the stored field is empty", () => {
    expect(resolveKnownFfttLicenseNumber(null, "1234567")).toBe("1234567");
    expect(resolveKnownFfttLicenseNumber("", "1234567")).toBe("1234567");
    expect(resolveKnownFfttLicenseNumber("   ", "1234567")).toBe("1234567");
  });

  it("accepts numeric values stored by Firestore", () => {
    expect(resolveKnownFfttLicenseNumber(7654321, undefined)).toBe("7654321");
    expect(resolveKnownFfttLicenseNumber(null, 1234567)).toBe("1234567");
  });
});

describe("readKnownFfttLicenseFromRegistrationData", () => {
  it("reads the lookup licence when ffttLicense is missing", () => {
    expect(
      readKnownFfttLicenseFromRegistrationData({
        ffttLicenseLookup: { licence: "9876543", nomClub: "SQY Ping" },
      })
    ).toBe("9876543");
  });

  it("keeps an explicitly cleared license empty even if a lookup exists", () => {
    expect(
      readKnownFfttLicenseFromRegistrationData({
        ffttLicense: "",
        ffttLicenseLookup: { licence: "9876543" },
      })
    ).toBeNull();
  });

  it("returns null when no license is known", () => {
    expect(readKnownFfttLicenseFromRegistrationData({})).toBeNull();
  });
});
