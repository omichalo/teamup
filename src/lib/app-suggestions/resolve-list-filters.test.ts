import {
  resolveSuggestionCategoryFilter,
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

describe("resolveSuggestionCategoryFilter", () => {
  it("retourne all par défaut", () => {
    expect(resolveSuggestionCategoryFilter(null)).toBe("all");
    expect(resolveSuggestionCategoryFilter("all")).toBe("all");
  });

  it("valide les catégories connues", () => {
    expect(resolveSuggestionCategoryFilter("adhesions")).toBe("adhesions");
  });

  it("ignore les valeurs inconnues", () => {
    expect(resolveSuggestionCategoryFilter("invalid")).toBe("all");
  });
});
