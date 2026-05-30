import { computeAgeAt, isAdultAt, isAtLeast40At, isMinorAt } from "./age";

/**
 * On utilise `new Date(y, m, d)` (heure locale) pour éviter les pièges
 * de fuseau horaire avec les littéraux "...Z".
 */
function localDate(y: number, m: number, d: number): Date {
  return new Date(y, m - 1, d, 12, 0, 0);
}

describe("isAdultAt", () => {
  it("retourne true le jour exact des 18 ans", () => {
    expect(isAdultAt("2007-05-11", localDate(2025, 5, 11))).toBe(true);
  });

  it("retourne false la veille des 18 ans", () => {
    expect(isAdultAt("2007-05-12", localDate(2025, 5, 11))).toBe(false);
  });

  it("retourne true bien après les 18 ans", () => {
    expect(isAdultAt("1980-01-15", localDate(2025, 6, 1))).toBe(true);
  });

  it("retourne false pour un enfant de 5 ans", () => {
    expect(isAdultAt("2020-01-01", localDate(2025, 6, 1))).toBe(false);
  });

  it("gère un anniversaire 29 février sur année non bissextile (28 fev = pas encore atteint)", () => {
    expect(isAdultAt("2008-02-29", localDate(2026, 2, 28))).toBe(false);
  });

  it("gère un anniversaire 29 février sur année non bissextile (1er mars = atteint)", () => {
    expect(isAdultAt("2008-02-29", localDate(2026, 3, 1))).toBe(true);
  });

  it("retourne false pour une date invalide", () => {
    expect(isAdultAt("", localDate(2025, 1, 1))).toBe(false);
    expect(isAdultAt("abcd-ef-gh", localDate(2025, 1, 1))).toBe(false);
    expect(isAdultAt("2025-13-01", localDate(2025, 1, 1))).toBe(false);
  });
});

describe("isMinorAt", () => {
  it("retourne true pour un enfant", () => {
    expect(isMinorAt("2015-06-01", localDate(2025, 6, 1))).toBe(true);
  });

  it("retourne false pour un adulte", () => {
    expect(isMinorAt("1990-06-01", localDate(2025, 6, 1))).toBe(false);
  });

  it("retourne false pour une date vide ou invalide (pas de présomption)", () => {
    expect(isMinorAt("", localDate(2025, 6, 1))).toBe(false);
    expect(isMinorAt("not-a-date", localDate(2025, 6, 1))).toBe(false);
  });
});

describe("isAtLeast40At", () => {
  it("retourne true le jour exact des 40 ans", () => {
    expect(isAtLeast40At("1985-05-11", localDate(2025, 5, 11))).toBe(true);
  });

  it("retourne false la veille des 40 ans", () => {
    expect(isAtLeast40At("1985-05-12", localDate(2025, 5, 11))).toBe(false);
  });

  it("retourne true bien après 40 ans", () => {
    expect(isAtLeast40At("1960-01-01", localDate(2025, 6, 1))).toBe(true);
  });

  it("retourne false pour une date vide ou invalide", () => {
    expect(isAtLeast40At("", localDate(2025, 6, 1))).toBe(false);
    expect(isAtLeast40At("abcd-ef-gh", localDate(2025, 6, 1))).toBe(false);
  });
});

describe("computeAgeAt", () => {
  it("retourne l'âge entier le jour de l'anniversaire", () => {
    expect(computeAgeAt("2000-01-15", localDate(2025, 1, 15))).toBe(25);
  });

  it("retourne l'âge - 1 la veille de l'anniversaire", () => {
    expect(computeAgeAt("2000-01-15", localDate(2025, 1, 14))).toBe(24);
  });

  it("retourne null pour une date vide ou invalide", () => {
    expect(computeAgeAt("", localDate(2025, 6, 1))).toBeNull();
    expect(computeAgeAt("nope", localDate(2025, 6, 1))).toBeNull();
  });
});
