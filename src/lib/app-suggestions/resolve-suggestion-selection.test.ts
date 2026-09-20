import { resolveSuggestionSelection } from "@/lib/app-suggestions/resolve-suggestion-selection";

describe("resolveSuggestionSelection", () => {
  const base = {
    suggestionIds: ["idea-1", "idea-2"],
    isMobile: false,
    hasUrlId: false,
  };

  it("conserve une sélection hors liste (lien direct / hors filtre)", () => {
    expect(
      resolveSuggestionSelection({
        ...base,
        selectedId: "idea-3",
        hasUrlId: true,
      })
    ).toBeUndefined();
  });

  it("conserve aussi une sélection hors liste sans hasUrlId (détail chargé par id)", () => {
    expect(
      resolveSuggestionSelection({
        ...base,
        selectedId: "idea-3",
      })
    ).toBeUndefined();
  });

  it("conserve une sélection hors liste sur mobile", () => {
    expect(
      resolveSuggestionSelection({
        ...base,
        selectedId: "idea-3",
        isMobile: true,
        hasUrlId: true,
      })
    ).toBeUndefined();
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
