import { buildSuggestionDetailUrl } from "@/lib/app-suggestions/suggestion-url";

describe("buildSuggestionDetailUrl", () => {
  it("construit un lien vers le détail d'une idée", () => {
    expect(
      buildSuggestionDetailUrl("https://app.example.com", "idea-123")
    ).toBe("https://app.example.com/club/idees?id=idea-123");
  });

  it("supprime le slash final de l'origine", () => {
    expect(buildSuggestionDetailUrl("https://app.example.com/", "x")).toBe(
      "https://app.example.com/club/idees?id=x"
    );
  });
});
