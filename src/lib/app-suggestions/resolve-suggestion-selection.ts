export type ResolveSuggestionSelectionInput = {
  selectedId: string | null;
  suggestionIds: readonly string[];
  isMobile: boolean;
  hasUrlId: boolean;
};

/**
 * Aligne la sélection avec la liste filtrée courante.
 * Retourne `null` pour désélectionner, un id pour sélectionner, ou `undefined` si inchangé.
 *
 * Une sélection absente de la liste (lien direct, hors filtre) est conservée :
 * le détail est chargé par id, indépendamment de la page filtrée.
 */
export function resolveSuggestionSelection(
  input: ResolveSuggestionSelectionInput
): string | null | undefined {
  const { selectedId, suggestionIds, isMobile, hasUrlId } = input;

  const selectedInList =
    selectedId !== null && suggestionIds.includes(selectedId);

  if (selectedId && !selectedInList) {
    return undefined;
  }

  if (!isMobile && !selectedId && suggestionIds.length > 0 && !hasUrlId) {
    return suggestionIds[0];
  }

  return undefined;
}
