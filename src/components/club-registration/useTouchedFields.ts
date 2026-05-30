"use client";

import { useCallback, useState } from "react";

/**
 * Petit hook utilitaire pour le pattern « validation onBlur » :
 * - L'utilisateur ne voit pas d'erreur pendant qu'il tape (pas de friction).
 * - Au premier `blur` du champ, on le marque comme "touched" : l'erreur de
 *   validation associée peut alors s'afficher en `helperText`.
 * - `markAll` permet d'afficher d'un coup toutes les erreurs (utilisé à la
 *   tentative de passage à l'étape suivante ou de soumission finale).
 *
 * On reste minimaliste : la source de vérité reste le draft Zod + les fonctions
 * `validateStep` du wizard. Ce hook ne stocke que la dimension UX « ce champ
 * a déjà été visité ».
 */
export function useTouchedFields() {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [allTouched, setAllTouched] = useState(false);

  const markTouched = useCallback((field: string) => {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  }, []);

  const markAll = useCallback(() => {
    setAllTouched(true);
  }, []);

  const reset = useCallback(() => {
    setTouched({});
    setAllTouched(false);
  }, []);

  const isTouched = useCallback(
    (field: string) => allTouched || Boolean(touched[field]),
    [touched, allTouched]
  );

  return { isTouched, markTouched, markAll, reset } as const;
}

export type UseTouchedFieldsReturn = ReturnType<typeof useTouchedFields>;
