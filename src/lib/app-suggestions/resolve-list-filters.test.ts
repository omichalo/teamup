import {
  resolveSuggestionCategoryFilter,
  resolveSuggestionKindFilter,
  resolveSuggestionMineFilter,
} from "@/lib/app-suggestions/resolve-list-filters";

describe("resolveSuggestionMineFilter", () => {
  it("active le filtre pour 1 ou true", () => {
    expect(resolveSuggestionMineFilter("1")).toBe(true);
    expect(resolveSuggestionMineFilter("true")).toBe(true);
  });

  it("désactive le filtre sinon", () => {
    expect(resolveSuggestionMineFilter(null)).toBe(false);
    expect(resolveSuggestionMineFilter("0")).toBe(false);
  });
});

describe("resolveSuggestionKindFilter", () => {
  it("retourne all par défaut", () => {
    expect(resolveSuggestionKindFilter(null)).toBe("all");
    expect(resolveSuggestionKindFilter("all")).toBe("all");
  });

  it("valide les types connus", () => {
    expect(resolveSuggestionKindFilter("improvement")).toBe("improvement");
    expect(resolveSuggestionKindFilter("problem")).toBe("problem");
  });

  it("ignore les valeurs inconnues", () => {
    expect(resolveSuggestionKindFilter("invalid")).toBe("all");
  });
});

describe("resolveSuggestionCategoryFilter", () => {
  it("retourne all par défaut", () => {
    expect(resolveSuggestionCategoryFilter(null)).toBe("all");
    expect(resolveSuggestionCategoryFilter("all")).toBe("all");
  });

  it("valide les catégories connues et personnalisées", () => {
    expect(resolveSuggestionCategoryFilter("adhesions")).toBe("adhesions");
    expect(resolveSuggestionCategoryFilter("Paiements")).toBe("Paiements");
  });

  it("ignore les valeurs trop courtes", () => {
    expect(resolveSuggestionCategoryFilter("a")).toBe("all");
  });
});
