import { resolveRosterEntryFromRegistration } from "./resolve-roster-entry";

const SEASON = "2026-2027";

describe("resolveRosterEntryFromRegistration", () => {
  it("upserts a paid competitor (Deshayes) even without club-list licence", () => {
    const result = resolveRosterEntryFromRegistration(SEASON, {
      registrationId: "MuRgYDhI8JUxwuc50yUQ",
      status: "paid",
      paymentStatus: "paid",
      firstName: "Laurent",
      lastName: "DESHAYES",
      competitionIds: ["championnat_equipe"],
      ffttLicense: "7876509",
      listedInClub: false,
      typeLicence: null,
      playerNomClub: "SQY PING",
    });
    expect(result.action).toBe("upsert");
    if (result.action !== "upsert") return;
    expect(result.record.personKey).toBe("7876509");
    expect(result.record.championnat).toBe(true);
    expect(result.record.licensePresence).toBe("fftt_sqy_unlicensed");
    expect(result.record.paymentStatus).toBe("paid");
  });

  it("keeps Marly with other-federation presence", () => {
    const result = resolveRosterEntryFromRegistration(SEASON, {
      registrationId: "GOaGSC1oWXFSMhalDx2S",
      status: "paid",
      firstName: "Nicolas",
      lastName: "MARLY",
      competitionIds: ["championnat_equipe"],
      ffttLicense: "25260171435",
      licenseValidationStatus: "other_federation",
      listedInClub: false,
    });
    expect(result.action).toBe("upsert");
    if (result.action !== "upsert") return;
    expect(result.record.licensePresence).toBe("other_federation");
  });

  it("skips leisure dossiers without championship intent", () => {
    const result = resolveRosterEntryFromRegistration(SEASON, {
      registrationId: "leis1",
      status: "paid",
      competitionIds: [],
      ffttLicense: "11111",
    });
    expect(result).toEqual({ action: "skip", reason: "no_intent" });
  });

  it("does not reinclude a coach-excluded player after a new seed", () => {
    const result = resolveRosterEntryFromRegistration(
      SEASON,
      {
        registrationId: "abc",
        status: "paid",
        competitionIds: ["championnat_equipe"],
        ffttLicense: "1234567",
      },
      { coachExcluded: true, coachIncluded: false }
    );
    expect(result).toEqual({ action: "exclude", personKey: "1234567" });
  });

  it("keeps a coach-included player without dossier intent", () => {
    const result = resolveRosterEntryFromRegistration(
      SEASON,
      {
        registrationId: "coach1",
        status: "paid",
        competitionIds: [],
        ffttLicense: "1234567",
      },
      {
        coachExcluded: false,
        coachIncluded: true,
        championnat: true,
        championnatParis: false,
      }
    );
    expect(result.action).toBe("upsert");
    if (result.action !== "upsert") return;
    expect(result.record.championnat).toBe(true);
    expect(result.record.includedFromDossier).toBe(false);
  });

  it("skips rejected registrations", () => {
    const result = resolveRosterEntryFromRegistration(SEASON, {
      registrationId: "rej",
      status: "rejected",
      competitionIds: ["championnat_equipe"],
    });
    expect(result).toEqual({ action: "skip", reason: "rejected" });
  });
});
