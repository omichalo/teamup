import {
  readRegistrationSeasonLabel,
  registrationMatchesActiveSeason,
  registrationMissingSeasonLabel,
  resolveRegistrationSeasonLabel,
} from "./resolve-registration-season-label";

describe("resolveRegistrationSeasonLabel", () => {
  const active = "2026-2027";

  it("retourne la saison persistée", () => {
    expect(readRegistrationSeasonLabel({ seasonLabel: "2026-2027" })).toBe("2026-2027");
    expect(resolveRegistrationSeasonLabel({ seasonLabel: "2026-2027" }, active)).toBe(
      "2026-2027"
    );
  });

  it("utilise la saison active si le champ est absent", () => {
    expect(registrationMissingSeasonLabel({})).toBe(true);
    expect(resolveRegistrationSeasonLabel({}, active)).toBe("2026-2027");
    expect(registrationMatchesActiveSeason({}, active)).toBe(true);
  });

  it("exclut une autre saison", () => {
    expect(registrationMatchesActiveSeason({ seasonLabel: "2025-2026" }, active)).toBe(false);
  });
});
