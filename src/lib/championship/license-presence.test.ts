import { resolveLicensePresence } from "./license-presence";

describe("resolveLicensePresence", () => {
  it("returns none without a license number", () => {
    expect(resolveLicensePresence({})).toBe("none");
  });

  it("returns in_club_list when the club list has a current T/P/A type", () => {
    expect(
      resolveLicensePresence({
        ffttLicense: "7886788",
        listedInClub: true,
        typeLicence: "T",
      })
    ).toBe("in_club_list");
  });

  it("treats a club-list affiliate without a season type as unlicensed", () => {
    expect(
      resolveLicensePresence({
        ffttLicense: "5984668",
        listedInClub: true,
        typeLicence: null,
        playerNomClub: "SQY PING",
      })
    ).toBe("fftt_sqy_unlicensed");
  });

  it("treats leftover last-season T/P/A on a SQY affiliation as unlicensed", () => {
    expect(
      resolveLicensePresence({
        ffttLicense: "1234567",
        listedInClub: false,
        typeLicence: "T",
        playerNomClub: "SQY PING",
      })
    ).toBe("fftt_sqy_unlicensed");
  });

  it("flags Deshayes-style SQY affiliation without a season licence", () => {
    expect(
      resolveLicensePresence({
        ffttLicense: "7876509",
        listedInClub: false,
        typeLicence: null,
        playerNomClub: "SQY PING",
      })
    ).toBe("fftt_sqy_unlicensed");
  });

  it("flags Marly-style other federation from license validation", () => {
    expect(
      resolveLicensePresence({
        ffttLicense: "25260171435",
        listedInClub: false,
        licenseValidationStatus: "other_federation",
      })
    ).toBe("other_federation");
  });

  it("flags a mutation to another club", () => {
    expect(
      resolveLicensePresence({
        ffttLicense: "7859322",
        listedInClub: false,
        typeLicence: "T",
        playerNomClub: "CHESNAY 78 AS",
      })
    ).toBe("other_club");
  });
});
