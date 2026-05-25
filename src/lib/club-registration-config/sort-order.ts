/** Utilitaires de réordonnancement pour sections, lieux et créneaux. */

export function sortBySortOrder<T extends { sortOrder: number }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function reorderBySortOrder<T extends { sortOrder: number }>(
  items: readonly T[],
  fromIndex: number,
  direction: -1 | 1
): T[] {
  const sorted = sortBySortOrder(items);
  const targetIndex = fromIndex + direction;
  if (targetIndex < 0 || targetIndex >= sorted.length) {
    return sorted.map((item, index) => ({ ...item, sortOrder: index }));
  }
  const next = [...sorted];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next.map((item, index) => ({ ...item, sortOrder: index }));
}

export function nextSortOrder<T extends { sortOrder: number }>(items: readonly T[]): number {
  if (items.length === 0) return 0;
  return Math.max(...items.map((item) => item.sortOrder)) + 1;
}

/** Renumérote sortOrder de 0 à n-1 après ajout/suppression. */
export function reindexSortOrder<T extends { sortOrder: number }>(items: readonly T[]): T[] {
  return sortBySortOrder(items).map((item, index) => ({ ...item, sortOrder: index }));
}

/** Réordonne une liste sans champ sortOrder (ordre du tableau = ordre d'affichage). */
export function reorderArray<T>(items: readonly T[], fromIndex: number, direction: -1 | 1): T[] {
  const targetIndex = fromIndex + direction;
  if (targetIndex < 0 || targetIndex >= items.length) return [...items];
  return moveArrayItem(items, fromIndex, targetIndex);
}

/** Déplace un élément d'un index à un autre (drag & drop). */
export function moveArrayItem<T>(items: readonly T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length
  ) {
    return [...items];
  }
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

/** Déplace un élément trié par sortOrder et renumérote. */
export function moveBySortOrder<T extends { sortOrder: number }>(
  items: readonly T[],
  fromIndex: number,
  toIndex: number
): T[] {
  return moveArrayItem(sortBySortOrder(items), fromIndex, toIndex).map((item, index) => ({
    ...item,
    sortOrder: index,
  }));
}
