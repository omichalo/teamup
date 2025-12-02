import { useState, useEffect, useMemo } from "react";
import { CompositionDefaultsService } from "@/lib/services/composition-defaults-service";
import { useChampionshipTypes } from "./useChampionshipTypes";

interface UseDefaultCompositionsOptions {
  selectedPhase: "aller" | "retour" | null;
}

export function useDefaultCompositions({
  selectedPhase,
}: UseDefaultCompositionsOptions) {
  const [defaultCompositions, setDefaultCompositions] = useState<{
    masculin: Record<string, string[]>;
    feminin: Record<string, string[]>;
  }>({
    masculin: {},
    feminin: {},
  });
  const [defaultCompositionsLoaded, setDefaultCompositionsLoaded] =
    useState(false);

  const { loadBoth, createEmpty } = useChampionshipTypes();
  const compositionDefaultsService = useMemo(
    () => new CompositionDefaultsService(),
    []
  );

  // Charger les compositions par défaut pour la phase sélectionnée
  useEffect(() => {
    if (!selectedPhase) {
      setDefaultCompositions({ masculin: {}, feminin: {} });
      setDefaultCompositionsLoaded(false);
      return;
    }

    setDefaultCompositionsLoaded(false);

    const loadDefaults = async () => {
      try {
        // Utiliser loadBoth pour charger les compositions en parallèle
        const result = await loadBoth({
          loadMasculin: () =>
            compositionDefaultsService.getDefaults(selectedPhase, "masculin"),
          loadFeminin: () =>
            compositionDefaultsService.getDefaults(selectedPhase, "feminin"),
          defaultValue: null,
        });

        setDefaultCompositions({
          masculin: result.data.masculin?.teams || {},
          feminin: result.data.feminin?.teams || {},
        });
      } catch (error) {
        console.error(
          "Erreur lors du chargement des compositions par défaut:",
          error
        );
        setDefaultCompositions(createEmpty<Record<string, string[]>>({}));
      }

      setDefaultCompositionsLoaded(true);
    };

    void loadDefaults();
  }, [selectedPhase, loadBoth, createEmpty, compositionDefaultsService]);

  return {
    defaultCompositions,
    setDefaultCompositions,
    defaultCompositionsLoaded,
  };
}

