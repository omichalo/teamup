import { useMemo } from "react";
import type { EquipeWithMatches } from "./useEquipesWithMatches";
import type { EpreuveType } from "@/lib/shared/epreuve-utils";
import { getMatchEpreuve } from "@/lib/shared/epreuve-utils";

/**
 * Hook pour filtrer les équipes selon l'épreuve sélectionnée
 */
export function useFilteredEquipes(
  equipes: EquipeWithMatches[],
  selectedEpreuve: EpreuveType | null
) {
  const filteredEquipes = useMemo(() => {
    if (!selectedEpreuve) {
      return equipes;
    }
    return equipes.filter((equipe) => {
      const epreuve = getMatchEpreuve(equipe.matches[0] || {}, equipe.team);
      return epreuve === selectedEpreuve;
    });
  }, [equipes, selectedEpreuve]);

  return { filteredEquipes };
}

