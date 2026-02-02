import { useEffect, useMemo } from "react";
import type { EquipeWithMatches } from "@/hooks/useTeamData";
import type { EpreuveType } from "@/lib/shared/epreuve-utils";
import { getPhaseOfNextChampionnatEquipesMatch } from "@/lib/shared/phase-utils";

export interface UsePhasePreselectParams {
  equipes: EquipeWithMatches[];
  loadingEquipes: boolean;
  currentPhase: "aller" | "retour";
  selectedEpreuve: EpreuveType | null;
  selectedPhase: "aller" | "retour" | null;
  setSelectedPhase: (p: "aller" | "retour" | null) => void;
}

/**
 * Hook partagé pour pré-sélectionner la phase (aller/retour) au chargement initial.
 * - Paris : phase forcée à "aller".
 * - Championnat par équipes : au premier rendu (selectedPhase === null), on met la phase
 *   du prochain match à jouer, ou currentPhase, ou "aller". La sélection utilisateur
 *   n'est jamais écrasée ensuite.
 */
export function usePhasePreselect({
  equipes,
  loadingEquipes,
  currentPhase,
  selectedEpreuve,
  selectedPhase,
  setSelectedPhase,
}: UsePhasePreselectParams): void {
  const phaseOfNextChampionnatEquipesMatch = useMemo(
    () => getPhaseOfNextChampionnatEquipesMatch(equipes),
    [equipes]
  );

  useEffect(() => {
    if (selectedEpreuve === null) return;

    if (selectedEpreuve === "championnat_paris") {
      if (selectedPhase !== "aller") {
        setSelectedPhase("aller");
      }
      return;
    }

    if (selectedEpreuve !== "championnat_equipes" || loadingEquipes) return;

    const phaseOfNext = phaseOfNextChampionnatEquipesMatch;
    const phase = phaseOfNext ?? currentPhase ?? "aller";

    if (selectedPhase === null) {
      setSelectedPhase(phase);
    }
  }, [
    currentPhase,
    loadingEquipes,
    phaseOfNextChampionnatEquipesMatch,
    selectedEpreuve,
    selectedPhase,
    setSelectedPhase,
  ]);
}
