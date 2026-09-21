import { effectiveLicensePresence } from "./effective-license-presence";

describe("effectiveLicensePresence", () => {
  it("garde la valeur stockée sans miroir", () => {
    expect(effectiveLicensePresence("other_club", null)).toBe("other_club");
    expect(effectiveLicensePresence(undefined, null)).toBe("unknown");
  });

  it("recalcule in_club_list depuis le miroir malgré unknown stocké", () => {
    expect(
      effectiveLicensePresence("unknown", {
        ffttLicense: "7889833",
        listedInClub: true,
        typeLicence: "P",
        playerNomClub: "SQY PING",
      })
    ).toBe("in_club_list");
  });

  it("recalcule fftt_sqy_unlicensed si hors liste club", () => {
    expect(
      effectiveLicensePresence("unknown", {
        ffttLicense: "1234567",
        listedInClub: false,
        typeLicence: "T",
        playerNomClub: "SQY PING",
      })
    ).toBe("fftt_sqy_unlicensed");
  });
});
