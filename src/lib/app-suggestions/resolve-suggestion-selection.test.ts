import { resolveSuggestionSelection } from "@/lib/app-suggestions/resolve-suggestion-selection";

describe("resolveSuggestionSelection", () => {
  const base = {
    suggestionIds: ["idea-1", "idea-2"],
    isMobile: false,
    hasUrlId: false,
  };

  it("désélectionne quand l'idée filtrée n'est plus dans la liste", () => {
    expect(
      resolveSuggestionSelection({
        ...base,
        selectedId: "idea-3",
        suggestionIds: [],
      })
    ).toBe(null);
  });

  it("sélectionne la première idée sur desktop si la sélection sort des filtres", () => {
    expect(
      resolveSuggestionSelection({
        ...base,
        selectedId: "idea-3",
      })
    ).toBe("idea-1");
  });

  it("désélectionne sur mobile si la sélection sort des filtres", () => {
    expect(
      resolveSuggestionSelection({
        ...base,
        selectedId: "idea-3",
        isMobile: true,
      })
    ).toBe(null);
  });

  it("auto-sélectionne la première idée sur desktop sans sélection", () => {
    expect(
      resolveSuggestionSelection({
        ...base,
        selectedId: null,
      })
    ).toBe("idea-1");
  });

  it("ne change pas une sélection valide", () => {
    expect(
      resolveSuggestionSelection({
        ...base,
        selectedId: "idea-2",
      })
    ).toBeUndefined();
  });

  it("ne force pas l'auto-sélection si un id est présent dans l'URL", () => {
    expect(
      resolveSuggestionSelection({
        ...base,
        selectedId: null,
        hasUrlId: true,
      })
    ).toBeUndefined();
  });
});
