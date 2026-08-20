export type ResolveManagedListSelectionInput = {
  selectedId: string | null;
  registrationIds: readonly string[];
  listReady: boolean;
  preserveSelectedId: boolean;
};

/**
 * Aligne la sélection avec la liste courante, sans écraser un `?id=`
 * (lien mail « Nouveau dossier à relire ») pendant le chargement ou si le
 * dossier n’est pas dans la page filtrée — le panneau détail le charge à part.
 */
export function resolveManagedListSelection(
  input: ResolveManagedListSelectionInput
): string | null | undefined {
  const { selectedId, registrationIds, listReady, preserveSelectedId } = input;

  if (!listReady) {
    return undefined;
  }

  if (preserveSelectedId && selectedId) {
    return undefined;
  }

  if (registrationIds.length === 0) {
    return selectedId === null ? undefined : null;
  }

  if (selectedId && registrationIds.includes(selectedId)) {
    return undefined;
  }

  return registrationIds[0] ?? null;
}
