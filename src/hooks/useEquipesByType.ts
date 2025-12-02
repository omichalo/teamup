import { useMemo } from "react";
import type { EquipeWithMatches } from "./useEquipesWithMatches";

/**
 * Hook pour grouper les équipes par type (masculin/féminin)
 */
export function useEquipesByType(filteredEquipes: EquipeWithMatches[]) {
  const equipesByType = useMemo(() => {
    const masculin: EquipeWithMatches[] = [];
    const feminin: EquipeWithMatches[] = [];

    filteredEquipes.forEach((equipe) => {
      // Déterminer si c'est une équipe féminine en regardant les matchs
      const isFemale = equipe.matches.some((match) => match.isFemale === true);

      if (isFemale) {
        feminin.push(equipe);
      } else {
        masculin.push(equipe);
      }
    });

    return { masculin, feminin };
  }, [filteredEquipes]);

  return equipesByType;
}

