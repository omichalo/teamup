import {
  buildSuggestionPriorityFields,
  resolveStoredSuggestionPriority,
} from "@/lib/app-suggestions/priority-fields";
import { SUGGESTION_PRIORITY_RANK } from "@/lib/app-suggestions/status";

describe("buildSuggestionPriorityFields", () => {
  it("associe le rang numérique à la priorité", () => {
    expect(buildSuggestionPriorityFields("high")).toEqual({
      priority: "high",
      priorityRank: SUGGESTION_PRIORITY_RANK.high,
    });
  });
});

describe("resolveStoredSuggestionPriority", () => {
  it("retombe sur moyenne si absent", () => {
    expect(resolveStoredSuggestionPriority(undefined)).toBe("medium");
  });
});
