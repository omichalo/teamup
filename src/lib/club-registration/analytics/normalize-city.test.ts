import { normalizeCity, normalizePostalCode } from "./normalize-city";

describe("normalizeCity", () => {
  it("normalise la casse et les espaces", () => {
    expect(normalizeCity("  GUYANCOURT ")).toBe("Guyancourt");
    expect(normalizeCity("magny-les-hameaux")).toBe("Magny-Les-Hameaux");
  });

  it("unifie espaces et tirets pour le regroupement", () => {
    expect(normalizeCity("Voisins Le Bretonneux")).toBe("Voisins-Le-Bretonneux");
    expect(normalizeCity("Voisins-Le-Bretonneux")).toBe("Voisins-Le-Bretonneux");
    expect(normalizeCity("VOISINS-LE-BRETONNEUX")).toBe("Voisins-Le-Bretonneux");
    expect(normalizeCity("Magny les Hameaux")).toBe("Magny-Les-Hameaux");
    expect(normalizeCity("Saint Cyr l'Ecole")).toBe("Saint-Cyr-L'Ecole");
    expect(normalizeCity("Saint-Cyr-L'école")).toBe("Saint-Cyr-L'École");
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
