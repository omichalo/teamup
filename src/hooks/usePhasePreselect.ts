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
 * Hook partagé pour pré-sélectionner la phase (aller/retour) sur les pages
 * compositions et compositions par défaut. Algorithme unifié :
 * - Paris : phase forcée à "aller".
 * - Championnat par équipes : phase du prochain match à jouer, avec fallbacks
 *   (currentPhase, "aller") et sync si la sélection diffère une fois les équipes chargées.
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
      return;
    }

    if (
      phaseOfNext != null &&
      selectedPhase !== phaseOfNext
    ) {
      setSelectedPhase(phaseOfNext);
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
