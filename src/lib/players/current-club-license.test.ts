import {
  currentClubLicenseFields,
  isPlayableLicenseType,
  typeLicenceFromFfttDetails,
} from "./current-club-license";

describe("currentClubLicenseFields", () => {
  it("treats leftover last-season T/P/A as inactive when not on the club list", () => {
    expect(
      currentClubLicenseFields({
        listedInClub: false,
        license: "1234567",
        typeLicence: "T",
      })
    ).toEqual({ isActive: false, typeLicence: "" });
  });

  it("keeps the FFTT type for people currently on the club list", () => {
    expect(
      currentClubLicenseFields({
        listedInClub: true,
        license: "1234567",
        typeLicence: "P",
      })
    ).toEqual({ isActive: true, typeLicence: "P" });
  });

  it("does not mark listed members without a playable type as active", () => {
    expect(
      currentClubLicenseFields({
        listedInClub: true,
        license: "5984668",
        typeLicence: "",
      })
    ).toEqual({ isActive: false, typeLicence: "" });
  });
});

describe("typeLicenceFromFfttDetails", () => {
  it("turns a null FFTT type into an empty string so last season T/P/A can be overwritten", () => {
    expect(typeLicenceFromFfttDetails(null)).toBe("");
    expect(typeLicenceFromFfttDetails(undefined)).toBe("");
    expect(typeLicenceFromFfttDetails("T")).toBe("T");
  });
});

describe("isPlayableLicenseType", () => {
  it("accepts T, P and A only", () => {
    expect(isPlayableLicenseType("T")).toBe(true);
    expect(isPlayableLicenseType("p")).toBe(true);
    expect(isPlayableLicenseType("X")).toBe(false);
  });
});
