import {
  allowsSuggestionEmail,
  resolveSuggestionEmailPreference,
} from "@/lib/app-suggestions/email-preferences";

describe("suggestion email preferences", () => {
  it("defaults unknown values to all", () => {
    expect(resolveSuggestionEmailPreference(undefined)).toBe("all");
    expect(resolveSuggestionEmailPreference("nope")).toBe("all");
  });

  it("blocks all mail when off", () => {
    expect(allowsSuggestionEmail("off", "problem")).toBe(false);
    expect(allowsSuggestionEmail("off", "comment")).toBe(false);
  });

  it("limits problems_only to problems", () => {
    expect(allowsSuggestionEmail("problems_only", "problem")).toBe(true);
    expect(allowsSuggestionEmail("problems_only", "improvement")).toBe(false);
    expect(allowsSuggestionEmail("problems_only", "comment")).toBe(false);
  });
});
