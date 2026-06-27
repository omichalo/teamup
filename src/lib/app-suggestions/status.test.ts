import {
  matchesSuggestionStatusFilter,
  resolveSuggestionStatusFilter,
  SUGGESTION_OPEN_STATUSES,
  SUGGESTION_PRIORITY_RANK,
  compareSuggestionsByPriority,
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

describe("compareSuggestionsByPriority", () => {
  it("classe la haute priorité avant la basse", () => {
    const sorted = [
      { priority: "low" as const, createdAt: "2026-01-02T00:00:00.000Z" },
      { priority: "high" as const, createdAt: "2026-01-01T00:00:00.000Z" },
      { priority: "medium" as const, createdAt: "2026-01-03T00:00:00.000Z" },
    ].sort(compareSuggestionsByPriority);

    expect(sorted.map((item) => item.priority)).toEqual(["high", "medium", "low"]);
  });

  it("départage à date égale de priorité", () => {
    expect(
      compareSuggestionsByPriority(
        { priority: "medium", createdAt: "2026-01-01T00:00:00.000Z" },
        { priority: "medium", createdAt: "2026-01-02T00:00:00.000Z" }
      )
    ).toBeGreaterThan(0);
  });
});

describe("SUGGESTION_PRIORITY_RANK", () => {
  it("ordonne haute > moyenne > basse", () => {
    expect(SUGGESTION_PRIORITY_RANK.high).toBeGreaterThan(SUGGESTION_PRIORITY_RANK.medium);
    expect(SUGGESTION_PRIORITY_RANK.medium).toBeGreaterThan(SUGGESTION_PRIORITY_RANK.low);
  });
});
