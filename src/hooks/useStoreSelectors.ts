import { useAppStore } from "@/stores/app-store";
import { useSelectionStore } from "@/stores/selection-store";
import { useMemo } from "react";
import { isParisChampionship } from "@/lib/shared/epreuve-utils";

/**
 * Hook pour accéder aux sélections depuis le store
 * Utilisé par les composants qui ont besoin des sélections mais ne veulent pas passer par les props
 */
export function useSelectionFromStore() {
  const {
    selectedEpreuve,
    selectedPhase,
    selectedJournee,
    setSelectedEpreuve,
    setSelectedPhase,
    setSelectedJournee,
  } = useSelectionStore();

  const isParis = useMemo(
    () => selectedEpreuve ? isParisChampionship(selectedEpreuve) : false,
    [selectedEpreuve]
  );

  return {
    selectedEpreuve,
    selectedPhase,
    selectedJournee,
    setSelectedEpreuve,
    setSelectedPhase,
    setSelectedJournee,
    isParis,
  };
}

/**
 * Hook pour accéder aux données Discord depuis le store
 */
export function useDiscordFromStore() {
  const { discordMembers, discordChannels } = useAppStore();
  return {
    discordMembers,
    discordChannels,
  };
}

/**
 * Hook pour accéder aux équipes depuis le store
 */
export function useEquipesFromStore() {
  const { equipes, loading } = useAppStore();
  return {
    equipes,
    loadingEquipes: loading.equipes,
  };
}

