import { useMemo, useEffect } from "react";
import { getCurrentPhase } from "@/lib/shared/phase-utils";
import type { EquipeWithMatches } from "./useEquipesWithMatches";
import type { EpreuveType } from "@/lib/shared/epreuve-utils";

interface UseCurrentPhaseOptions {
  equipes: EquipeWithMatches[];
  loadingEquipes: boolean;
  selectedEpreuve: EpreuveType | null;
  selectedPhase: "aller" | "retour" | null;
  setSelectedPhase: (phase: "aller" | "retour" | null) => void;
}

/**
 * Hook pour gérer la phase actuelle et l'auto-sélection
 */
export function useCurrentPhase(options: UseCurrentPhaseOptions): {
  currentPhase: "aller" | "retour";
} {
  const {
    equipes,
    loadingEquipes,
    selectedEpreuve,
    selectedPhase,
    setSelectedPhase,
  } = options;

  const currentPhase = useMemo(() => {
    if (loadingEquipes || equipes.length === 0) {
      return "aller" as const;
    }
    return getCurrentPhase(equipes);
  }, [equipes, loadingEquipes]);

  useEffect(() => {
    // Pour le championnat de Paris, définir automatiquement la phase à "aller"
    if (selectedEpreuve === "championnat_paris") {
      if (selectedPhase !== "aller") {
        setSelectedPhase("aller");
      }
    } else if (selectedPhase === null && currentPhase) {
      setSelectedPhase(currentPhase);
    }
  }, [currentPhase, selectedPhase, selectedEpreuve, setSelectedPhase]);

  return { currentPhase };
}

