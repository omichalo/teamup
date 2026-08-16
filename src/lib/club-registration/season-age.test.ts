import {
  getClubSeasonAgeReferenceDate,
  isAdultPpsEligibleForClubSeason,
  isAtLeast65ForClubSeason,
  isMinorForClubSeason,
  parseSeasonAgeReferenceDate,
} from "./season-age";

describe("parseSeasonAgeReferenceDate", () => {
  it("prend le 1er septembre de la première année", () => {
    const at = parseSeasonAgeReferenceDate("2025-2026");
    expect(at).not.toBeNull();
    expect(at?.getFullYear()).toBe(2025);
    expect(at?.getMonth()).toBe(8);
    expect(at?.getDate()).toBe(1);
  });

  it("accepte le séparateur slash et une année de fin courte", () => {
    const at = parseSeasonAgeReferenceDate("2026/27");
    expect(at?.getFullYear()).toBe(2026);
    expect(at?.getMonth()).toBe(8);
  });

  it("rejette un libellé invalide", () => {
    expect(parseSeasonAgeReferenceDate("saison 26")).toBeNull();
    expect(parseSeasonAgeReferenceDate("")).toBeNull();
  });
});

describe("âge de saison club", () => {
  const season = "2025-2026";

  it("classe mineur un joueur majeur au calendrier mais pas au 1er septembre", () => {
    expect(isMinorForClubSeason("2008-01-15", season)).toBe(true);
    expect(isAdultPpsEligibleForClubSeason("2008-01-15", season)).toBe(false);
  });

  it("classe adulte PPS un joueur déjà majeur au 1er septembre", () => {
    expect(isMinorForClubSeason("2007-08-01", season)).toBe(false);
    expect(isAdultPpsEligibleForClubSeason("2007-08-01", season)).toBe(true);
  });

  it("applique le seuil vétéran 65 ans à la date de saison", () => {
    expect(isAtLeast65ForClubSeason("1960-09-01", season)).toBe(true);
    expect(isAtLeast65ForClubSeason("1960-09-02", season)).toBe(false);
  });

  it("utilise la saison par défaut de la config si le libellé est omis", () => {
    const at = getClubSeasonAgeReferenceDate();
    expect(at.getMonth()).toBe(8);
    expect(at.getDate()).toBe(1);
  });
});
