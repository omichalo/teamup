import { create } from "zustand";
import { AvailabilityResponse } from "@/lib/services/availability-service";
import { EpreuveType } from "@/lib/shared/epreuve-utils";
import {
  AvailabilityState,
  PlayerAvailabilityByType,
  updateAvailabilityState,
} from "@/lib/availability/utils";
import { ChampionshipType } from "@/types";

interface AvailabilityFilters {
  selectedEpreuve: EpreuveType | null;
  selectedJournee: number | null;
  selectedPhase: "aller" | "retour" | null;
  showAllPlayers: boolean;
  searchQuery: string;
}

interface AvailabilityStoreState extends AvailabilityFilters {
  availabilities: AvailabilityState;
  setSelectedEpreuve: (epreuve: EpreuveType | null) => void;
  setSelectedJournee: (journee: number | null) => void;
  setSelectedPhase: (phase: "aller" | "retour" | null) => void;
  setShowAllPlayers: (show: boolean) => void;
  setSearchQuery: (query: string) => void;
  setAvailabilities: (next: AvailabilityState) => void;
  resetAvailabilities: () => void;
  updateAvailabilityEntry: (
    playerId: string,
    championshipType: ChampionshipType,
    computeNextEntry: (currentEntry: AvailabilityResponse | undefined) =>
      | AvailabilityResponse
      | undefined,
    options?: { skipNormalization?: boolean }
  ) => AvailabilityState | null;
  removeAvailabilityEntry: (
    playerId: string,
    championshipType: ChampionshipType,
    field: keyof AvailabilityResponse
  ) => void;
}

export const useAvailabilityStore = create<AvailabilityStoreState>((set) => ({
  selectedEpreuve: null,
  selectedJournee: null,
  selectedPhase: null,
  showAllPlayers: false,
  searchQuery: "",
  availabilities: {},
  setSelectedEpreuve: (epreuve) => set({ selectedEpreuve: epreuve }),
  setSelectedJournee: (journee) => set({ selectedJournee: journee }),
  setSelectedPhase: (phase) => set({ selectedPhase: phase }),
  setShowAllPlayers: (showAllPlayers) => set({ showAllPlayers }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setAvailabilities: (next) => set({ availabilities: next }),
  resetAvailabilities: () => set({ availabilities: {} }),
  updateAvailabilityEntry: (
    playerId,
    championshipType,
    computeNextEntry,
    options
  ) => {
    let snapshot: AvailabilityState | null = null;
    set((state) => {
      const { nextState, changed } = updateAvailabilityState(
        state.availabilities,
        playerId,
        championshipType,
        computeNextEntry,
        options?.skipNormalization
      );
      if (changed) {
        snapshot = nextState;
        return { availabilities: nextState };
      }
      return {};
    });
    return snapshot;
  },
  removeAvailabilityEntry: (playerId, championshipType, field) =>
    set((state) => {
      const currentPlayerState: PlayerAvailabilityByType | undefined =
        state.availabilities[playerId];

      if (!currentPlayerState?.[championshipType]) {
        return {};
      }

      const currentEntry = currentPlayerState[championshipType];
      const nextEntry = { ...currentEntry } as AvailabilityResponse;

      if (field in nextEntry) {
        delete nextEntry[field];
      }

      const hasData =
        nextEntry.available !== undefined ||
        (typeof nextEntry.comment === "string" && nextEntry.comment.trim().length > 0);

      const nextPlayerState: PlayerAvailabilityByType = { ...currentPlayerState };

      if (hasData) {
        nextPlayerState[championshipType] = nextEntry;
      } else {
        delete nextPlayerState[championshipType];
      }

      const nextAvailabilities: AvailabilityState = { ...state.availabilities };

      if (Object.keys(nextPlayerState).length === 0) {
        delete nextAvailabilities[playerId];
      } else {
        nextAvailabilities[playerId] = nextPlayerState;
      }

      return { availabilities: nextAvailabilities };
    }),
}));
