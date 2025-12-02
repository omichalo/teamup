import { useEffect } from "react";
import { useSelectionStore } from "@/stores/selection-store";
import { useEpreuvePhaseJourneeSelection } from "./useEpreuvePhaseJourneeSelection";
import type { EquipeWithMatches } from "./useEquipesWithMatches";

/**
 * Hook qui combine le store de sélections avec la logique d'initialisation
 * Synchronise les sélections du store avec la logique existante
 */
interface UseSelectionOptions {
  equipes: EquipeWithMatches[];
  loadingEquipes: boolean;
  autoInitialize?: boolean;
  showJournee?: boolean;
}

export function useSelection(options: UseSelectionOptions) {
  const { equipes, loadingEquipes, autoInitialize = true, showJournee = true } = options;

  // Récupérer les sélections depuis le store
  const {
    selectedEpreuve: storeEpreuve,
    selectedPhase: storePhase,
    selectedJournee: storeJournee,
    setSelectedEpreuve: setStoreEpreuve,
    setSelectedPhase: setStorePhase,
    setSelectedJournee: setStoreJournee,
  } = useSelectionStore();

  // Utiliser le hook existant pour la logique d'initialisation
  const {
    selectedEpreuve: hookEpreuve,
    selectedPhase: hookPhase,
    selectedJournee: hookJournee,
    setSelectedEpreuve: setHookEpreuve,
    setSelectedPhase: setHookPhase,
    setSelectedJournee: setHookJournee,
    journeesByPhase,
    isParis,
  } = useEpreuvePhaseJourneeSelection({
    equipes,
    loadingEquipes,
    initialEpreuve: storeEpreuve,
    initialPhase: storePhase,
    initialJournee: storeJournee,
    autoInitialize,
    showJournee,
  });

  // Synchroniser le store avec les changements du hook (si auto-initialisation)
  useEffect(() => {
    if (autoInitialize && hookEpreuve !== storeEpreuve) {
      setStoreEpreuve(hookEpreuve);
    }
  }, [autoInitialize, hookEpreuve, storeEpreuve, setStoreEpreuve]);

  useEffect(() => {
    if (autoInitialize && hookPhase !== storePhase) {
      setStorePhase(hookPhase);
    }
  }, [autoInitialize, hookPhase, storePhase, setStorePhase]);

  useEffect(() => {
    if (autoInitialize && hookJournee !== storeJournee) {
      setStoreJournee(hookJournee);
    }
  }, [autoInitialize, hookJournee, storeJournee, setStoreJournee]);

  // Wrappers pour les setters qui mettent à jour à la fois le hook et le store
  const setSelectedEpreuve = (epreuve: typeof hookEpreuve) => {
    setHookEpreuve(epreuve);
    setStoreEpreuve(epreuve);
  };

  const setSelectedPhase = (phase: typeof hookPhase) => {
    setHookPhase(phase);
    setStorePhase(phase);
  };

  const setSelectedJournee = (journee: typeof hookJournee) => {
    setHookJournee(journee);
    setStoreJournee(journee);
  };

  return {
    selectedEpreuve: hookEpreuve,
    selectedPhase: hookPhase,
    selectedJournee: hookJournee,
    setSelectedEpreuve,
    setSelectedPhase,
    setSelectedJournee,
    journeesByPhase,
    isParis,
  };
}

