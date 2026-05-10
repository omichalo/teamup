import { useEffect, useState } from "react";
import { CompositionDefaultsService } from "@/lib/services/composition-defaults-service";

interface DefaultCompositionsState {
  masculin: Record<string, string[]>;
  feminin: Record<string, string[]>;
}

interface UseDefaultCompositionsParams {
  selectedPhase: "aller" | "retour" | null;
  compositionDefaultsService: CompositionDefaultsService;
}

export function useDefaultCompositions({
  selectedPhase,
  compositionDefaultsService,
}: UseDefaultCompositionsParams) {
  const [defaultCompositions, setDefaultCompositions] =
    useState<DefaultCompositionsState>({
      masculin: {},
      feminin: {},
    });
  const [defaultCompositionsLoaded, setDefaultCompositionsLoaded] =
    useState(false);

  useEffect(() => {
    if (!selectedPhase) {
      setDefaultCompositions({ masculin: {}, feminin: {} });
      setDefaultCompositionsLoaded(false);
      return;
    }

    setDefaultCompositionsLoaded(false);

    const loadDefaults = async () => {
      try {
        const [masculineDefaults, feminineDefaults] = await Promise.all([
          compositionDefaultsService.getDefaults(selectedPhase, "masculin"),
          compositionDefaultsService.getDefaults(selectedPhase, "feminin"),
        ]);

        setDefaultCompositions({
          masculin: masculineDefaults?.teams || {},
          feminin: feminineDefaults?.teams || {},
        });
      } catch (error) {
        console.error(
          "Erreur lors du chargement des compositions par défaut:",
          error
        );
        setDefaultCompositions({ masculin: {}, feminin: {} });
      }

      setDefaultCompositionsLoaded(true);
    };

    void loadDefaults();
  }, [selectedPhase, compositionDefaultsService]);

  return {
    defaultCompositions,
    setDefaultCompositions,
    defaultCompositionsLoaded,
  };
}
