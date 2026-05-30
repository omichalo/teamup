"use client";

import { useCallback, useState } from "react";

/** Gère l'ouverture des items pliables sans replier les autres. */
export function useConfigEditorExpansion() {
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(() => new Set());

  const isExpanded = useCallback((id: string) => expandedIds.has(id), [expandedIds]);

  const setExpanded = useCallback((id: string, expanded: boolean) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (expanded) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const expandItem = useCallback((id: string) => {
    setExpandedIds((prev) => new Set(prev).add(id));
  }, []);

  return { isExpanded, setExpanded, expandItem };
}

export type ConfigEditorExpansion = ReturnType<typeof useConfigEditorExpansion>;
