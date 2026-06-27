import {
  formatSuggestionCategoryLabel,
  isValidSuggestionCategory,
  mergeSuggestionCategoryOptions,
  normalizeSuggestionCategory,
} from "@/lib/app-suggestions/categories";

describe("normalizeSuggestionCategory", () => {
  it("trim et limite la longueur", () => {
    expect(normalizeSuggestionCategory("  Paiements   Stripe  ")).toBe(
      "Paiements Stripe"
    );
  });
});

describe("isValidSuggestionCategory", () => {
  it("exige au moins 2 caractères", () => {
    expect(isValidSuggestionCategory("a")).toBe(false);
    expect(isValidSuggestionCategory("Adhésions")).toBe(true);
  });
});

describe("formatSuggestionCategoryLabel", () => {
  it("résout les catégories par défaut", () => {
    expect(formatSuggestionCategoryLabel("adhesions")).toBe("Adhésions");
  });

  it("affiche les catégories personnalisées telles quelles", () => {
    expect(formatSuggestionCategoryLabel("Paiements")).toBe("Paiements");
  });
});

describe("mergeSuggestionCategoryOptions", () => {
  it("fusionne défaut et personnalisées sans doublon", () => {
    const options = mergeSuggestionCategoryOptions(["Paiements", "adhesions"]);
    expect(options.map((option) => option.value)).toEqual(
      expect.arrayContaining(["adhesions", "Paiements"])
    );
    expect(options).toHaveLength(6);
  });
});
