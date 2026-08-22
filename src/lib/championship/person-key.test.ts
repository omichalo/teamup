import {
  parseRegistrationPersonKey,
  resolveChampionshipPersonKey,
  sanitizeSeasonLabel,
  temporaryPersonKey,
} from "./person-key";

describe("resolveChampionshipPersonKey", () => {
  it("prefers a valid FFTT license", () => {
    expect(
      resolveChampionshipPersonKey({
        ffttLicense: "7876509",
        registrationId: "abc",
      })
    ).toBe("7876509");
  });

  it("falls back to the registration id", () => {
    expect(
      resolveChampionshipPersonKey({
        ffttLicense: "",
        registrationId: "MuRgYDhI8JUxwuc50yUQ",
      })
    ).toBe("reg_MuRgYDhI8JUxwuc50yUQ");
  });

  it("strips non-digits from the license", () => {
    expect(
      resolveChampionshipPersonKey({ ffttLicense: " 78 76509 " })
    ).toBe("7876509");
  });

  it("returns null without license or registration", () => {
    expect(resolveChampionshipPersonKey({})).toBeNull();
  });
});

describe("parseRegistrationPersonKey", () => {
  it("reads the registration id", () => {
    expect(parseRegistrationPersonKey("reg_abc")).toBe("abc");
  });

  it("rejects a license key", () => {
    expect(parseRegistrationPersonKey("7876509")).toBeNull();
  });
});

describe("temporaryPersonKey", () => {
  it("uses a valid license when provided", () => {
    expect(temporaryPersonKey("7876509")).toBe("7876509");
  });

  it("falls back to a tmp_ key without a license", () => {
    expect(temporaryPersonKey()).toMatch(/^tmp_[a-f0-9]{12}$/);
  });
});

describe("sanitizeSeasonLabel", () => {
  it("keeps a standard season label", () => {
    expect(sanitizeSeasonLabel("2026-2027")).toBe("2026-2027");
  });
});
