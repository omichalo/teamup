import {
  matchesSuggestionStatusFilter,
  resolveSuggestionStatusFilter,
  SUGGESTION_OPEN_STATUSES,
} from "@/lib/app-suggestions/status";

describe("resolveSuggestionStatusFilter", () => {
  it("utilise ouvertes par défaut", () => {
    expect(resolveSuggestionStatusFilter(null)).toBe("open");
    expect(resolveSuggestionStatusFilter(undefined)).toBe("open");
    expect(resolveSuggestionStatusFilter("")).toBe("open");
    expect(resolveSuggestionStatusFilter("unknown")).toBe("open");
  });

  it("accepte les valeurs connues", () => {
    expect(resolveSuggestionStatusFilter("all")).toBe("all");
    expect(resolveSuggestionStatusFilter("open")).toBe("open");
    expect(resolveSuggestionStatusFilter("released")).toBe("released");
  });
});

describe("matchesSuggestionStatusFilter", () => {
  it("filtre les retours ouverts", () => {
    expect(matchesSuggestionStatusFilter("received", "open")).toBe(true);
    expect(matchesSuggestionStatusFilter("released", "open")).toBe(false);
    expect(matchesSuggestionStatusFilter("declined", "open")).toBe(false);
  });

  it("couvre tous les statuts ouverts", () => {
    for (const status of SUGGESTION_OPEN_STATUSES) {
      expect(matchesSuggestionStatusFilter(status, "open")).toBe(true);
    }
  });
});
