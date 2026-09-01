import { normalizeCity, normalizePostalCode } from "./normalize-city";

describe("normalizeCity", () => {
  it("normalise la casse et les espaces", () => {
    expect(normalizeCity("  GUYANCOURT ")).toBe("Guyancourt");
    expect(normalizeCity("magny-les-hameaux")).toBe("Magny-Les-Hameaux");
  });

  it("retourne une chaîne vide si absent", () => {
    expect(normalizeCity("")).toBe("");
    expect(normalizeCity(undefined)).toBe("");
  });
});

describe("normalizePostalCode", () => {
  it("conserve un code postal à 5 chiffres", () => {
    expect(normalizePostalCode(" 78280 ")).toBe("78280");
  });
});
