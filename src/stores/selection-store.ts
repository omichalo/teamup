import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { EpreuveType } from "@/lib/shared/epreuve-utils";

/**
 * Store pour les sélections partagées entre les pages
 * (épreuve, phase, journée)
 * Persisté dans localStorage pour se souvenir des préférences utilisateur
 */
interface SelectionState {
  selectedEpreuve: EpreuveType | null;
  selectedPhase: "aller" | "retour" | null;
  selectedJournee: number | null;

  // Actions
  setSelectedEpreuve: (epreuve: EpreuveType | null) => void;
  setSelectedPhase: (phase: "aller" | "retour" | null) => void;
  setSelectedJournee: (journee: number | null) => void;

  // Action pour réinitialiser
  reset: () => void;
}

const initialState: Omit<SelectionState, "setSelectedEpreuve" | "setSelectedPhase" | "setSelectedJournee" | "reset"> = {
  selectedEpreuve: null,
  selectedPhase: null,
  selectedJournee: null,
};

export const useSelectionStore = create<SelectionState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setSelectedEpreuve: (selectedEpreuve) =>
          set(
            (state) => ({
              selectedEpreuve,
              // Réinitialiser phase et journée lors du changement d'épreuve
              selectedPhase: state.selectedEpreuve !== selectedEpreuve ? null : state.selectedPhase,
              selectedJournee: state.selectedEpreuve !== selectedEpreuve ? null : state.selectedJournee,
            }),
            false,
            "setSelectedEpreuve"
          ),

        setSelectedPhase: (selectedPhase) =>
          set(
            (state) => ({
              selectedPhase,
              // Réinitialiser journée lors du changement de phase
              selectedJournee: state.selectedPhase !== selectedPhase ? null : state.selectedJournee,
            }),
            false,
            "setSelectedPhase"
          ),

        setSelectedJournee: (selectedJournee) =>
          set({ selectedJournee }, false, "setSelectedJournee"),

        reset: () => set(initialState, false, "reset"),
      }),
      {
        name: "selection-storage",
        // Ne persister que les sélections, pas les actions
        partialize: (state) => ({
          selectedEpreuve: state.selectedEpreuve,
          selectedPhase: state.selectedPhase,
          selectedJournee: state.selectedJournee,
        }),
      }
    ),
    { name: "SelectionStore" }
  )
);

