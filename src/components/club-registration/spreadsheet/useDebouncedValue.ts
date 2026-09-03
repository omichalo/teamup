"use client";

import { useEffect, useState } from "react";

/** Valeur retardée — pour debounce recherche / filtres sans perdre l’input contrôlé. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
