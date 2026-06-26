export type ResolveSuggestionSelectionInput = {
  selectedId: string | null;
  suggestionIds: readonly string[];
  isMobile: boolean;
  hasUrlId: boolean;
};

/**
 * Aligne la sélection avec la liste filtrée courante.
 * Retourne `null` pour désélectionner, un id pour sélectionner, ou `undefined` si inchangé.
 */
export function resolveSuggestionSelection(
  input: ResolveSuggestionSelectionInput
): string | null | undefined {
  const { selectedId, suggestionIds, isMobile, hasUrlId } = input;

  const selectedInList =
    selectedId !== null && suggestionIds.includes(selectedId);

  if (selectedId && !selectedInList) {
    if (!isMobile && suggestionIds.length > 0) {
      return suggestionIds[0];
    }
    return null;
  }

  if (!isMobile && !selectedId && suggestionIds.length > 0 && !hasUrlId) {
    return suggestionIds[0];
  }

  return undefined;
}
