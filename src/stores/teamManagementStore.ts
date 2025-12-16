import { create } from "zustand";
import { EquipeWithMatches } from "@/hooks/useTeamData";
import {
  transformAggregatedTeamEntry,
  type AggregatedTeamEntry,
} from "@/lib/client/team-match-transform";
import { AvailabilityService, DayAvailability } from "@/lib/services/availability-service";
import {
  CompositionDefaultsService,
  PhaseCompositionDefaults,
} from "@/lib/services/composition-defaults-service";
import { CompositionService, DayComposition } from "@/lib/services/composition-service";
import { FirestorePlayerService } from "@/lib/services/firestore-player-service";
import { Player } from "@/types/team-management";
import { ChampionshipType, Team } from "@/types";

const playerService = new FirestorePlayerService();
const availabilityService = new AvailabilityService();
const compositionService = new CompositionService();
const compositionDefaultsService = new CompositionDefaultsService();

export const getDayKey = (params: {
  journee: number;
  phase: "aller" | "retour";
  championshipType: ChampionshipType;
  idEpreuve?: number;
}) => {
  const { journee, phase, championshipType, idEpreuve } = params;
  return `${championshipType}:${phase}:${journee}${
    idEpreuve !== undefined ? `:${idEpreuve}` : ""
  }`;
};

interface TeamManagementState {
  players: Player[];
  playersLoading: boolean;
  playersError: string | null;

  equipesWithMatches: EquipeWithMatches[];
  equipesLoading: boolean;
  equipesError: string | null;

  availabilityByKey: Record<string, DayAvailability>;
  availabilityLoading: Record<string, boolean>;
  availabilityError: Record<string, string | null>;
  availabilitySubscriptions: Record<string, () => void>;

  compositionsByKey: Record<string, DayComposition>;
  compositionsLoading: Record<string, boolean>;
  compositionsError: Record<string, string | null>;
  compositionSubscriptions: Record<string, () => void>;

  defaultsByChampionship: Record<
    ChampionshipType,
    Record<"aller" | "retour", PhaseCompositionDefaults | null>
  >;
  defaultsLoading: Record<ChampionshipType, Record<"aller" | "retour", boolean>>;
  defaultsError: Record<
    ChampionshipType,
    Record<"aller" | "retour", string | null>
  >;

  loadPlayers: () => Promise<void>;
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  loadEquipesWithMatches: () => Promise<void>;
  updateTeam: (teamId: string, updates: Partial<Team>) => void;
  subscribeToAvailability: (params: {
    journee: number;
    phase: "aller" | "retour";
    championshipType: ChampionshipType;
    idEpreuve?: number;
  }) => () => void;
  subscribeToComposition: (params: {
    journee: number;
    phase: "aller" | "retour";
    championshipType: ChampionshipType;
  }) => () => void;
  fetchCompositionDefaults: (params: {
    phase: "aller" | "retour";
    championshipType: ChampionshipType;
  }) => Promise<void>;
}

export const useTeamManagementStore = create<TeamManagementState>((set, get) => ({
  players: [],
  playersLoading: false,
  playersError: null,

  equipesWithMatches: [],
  equipesLoading: false,
  equipesError: null,

  availabilityByKey: {},
  availabilityLoading: {},
  availabilityError: {},
  availabilitySubscriptions: {},

  compositionsByKey: {},
  compositionsLoading: {},
  compositionsError: {},
  compositionSubscriptions: {},

  defaultsByChampionship: {
    masculin: { aller: null, retour: null },
    feminin: { aller: null, retour: null },
  },
  defaultsLoading: {
    masculin: { aller: false, retour: false },
    feminin: { aller: false, retour: false },
  },
  defaultsError: {
    masculin: { aller: null, retour: null },
    feminin: { aller: null, retour: null },
  },

  loadPlayers: async () => {
    try {
      set({ playersLoading: true, playersError: null });
      const players = await playerService.getAllPlayers();
      set({ players, playersLoading: false });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur de chargement";
      set({ players: [], playersLoading: false, playersError: message });
    }
  },

  updatePlayer: (playerId: string, updates: Partial<Player>) => {
    set((state) => {
      const playerIndex = state.players.findIndex((p) => p.id === playerId);
      if (playerIndex === -1) {
        // Joueur non trouvé dans le store, ne rien faire
        return state;
      }
      const updatedPlayers = [...state.players];
      updatedPlayers[playerIndex] = {
        ...updatedPlayers[playerIndex],
        ...updates,
      };
      return { players: updatedPlayers };
    });
  },

  addPlayer: (player: Player) => {
    set((state) => {
      // Vérifier si le joueur existe déjà
      if (state.players.some((p) => p.id === player.id)) {
        return state;
      }
      return { players: [...state.players, player] };
    });
  },

  removePlayer: (playerId: string) => {
    set((state) => ({
      players: state.players.filter((p) => p.id !== playerId),
    }));
  },

  loadEquipesWithMatches: async () => {
    try {
      set({ equipesLoading: true, equipesError: null });
      const response = await fetch("/api/teams/matches");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const aggregated = Array.isArray(result.teams) ? result.teams : [];

      const equipesWithMatches: EquipeWithMatches[] = aggregated.map(
        (entry: { team: unknown; matches: unknown[] }) =>
          transformAggregatedTeamEntry(entry as AggregatedTeamEntry)
      );

      const getTeamNumber = (team: EquipeWithMatches["team"]) => {
        const potentialNumber = (team as { number?: number }).number;
        return typeof potentialNumber === "number" ? potentialNumber : 0;
      };

      const sortedEquipes = equipesWithMatches.sort(
        (a, b) => getTeamNumber(a.team) - getTeamNumber(b.team)
      );

      set({ equipesWithMatches: sortedEquipes, equipesLoading: false });
    } catch (error) {
      console.error("Error fetching equipes with matches:", error);
      set({
        equipesWithMatches: [],
        equipesLoading: false,
        equipesError: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  updateTeam: (teamId: string, updates: Partial<Team>) => {
    set((state) => {
      const equipeIndex = state.equipesWithMatches.findIndex(
        (e) => e.team.id === teamId
      );
      if (equipeIndex === -1) {
        // Équipe non trouvée dans le store, ne rien faire
        return state;
      }
      const updatedEquipes = [...state.equipesWithMatches];
      updatedEquipes[equipeIndex] = {
        ...updatedEquipes[equipeIndex],
        team: {
          ...updatedEquipes[equipeIndex].team,
          ...updates,
        },
      };
      return { equipesWithMatches: updatedEquipes };
    });
  },

  subscribeToAvailability: ({ journee, phase, championshipType, idEpreuve }) => {
    const key = getDayKey(
      idEpreuve !== undefined
        ? { journee, phase, championshipType, idEpreuve }
        : { journee, phase, championshipType }
    );
    const existing = get().availabilitySubscriptions[key];
    if (existing) {
      existing();
    }

    set((state) => ({
      availabilityLoading: { ...state.availabilityLoading, [key]: true },
      availabilityError: { ...state.availabilityError, [key]: null },
    }));

    const unsubscribe = availabilityService.subscribeToAvailability(
      journee,
      phase,
      championshipType,
      (data) => {
        set((state) => ({
          availabilityByKey: data
            ? { ...state.availabilityByKey, [key]: data }
            : state.availabilityByKey,
          availabilityLoading: { ...state.availabilityLoading, [key]: false },
        }));
      },
      idEpreuve
    );

    set((state) => ({
      availabilitySubscriptions: { ...state.availabilitySubscriptions, [key]: unsubscribe },
    }));

    return () => {
      unsubscribe();
      set((state) => {
        const nextSubs = { ...state.availabilitySubscriptions };
        delete nextSubs[key];
        return { availabilitySubscriptions: nextSubs };
      });
    };
  },

  subscribeToComposition: ({ journee, phase, championshipType }) => {
    const key = getDayKey({ journee, phase, championshipType });
    const existing = get().compositionSubscriptions[key];
    if (existing) {
      existing();
    }

    set((state) => ({
      compositionsLoading: { ...state.compositionsLoading, [key]: true },
      compositionsError: { ...state.compositionsError, [key]: null },
    }));

    const unsubscribe = compositionService.subscribeToComposition(
      journee,
      phase,
      championshipType,
      (data) => {
        set((state) => ({
          compositionsByKey: data
            ? { ...state.compositionsByKey, [key]: data }
            : state.compositionsByKey,
          compositionsLoading: { ...state.compositionsLoading, [key]: false },
        }));
      }
    );

    set((state) => ({
      compositionSubscriptions: { ...state.compositionSubscriptions, [key]: unsubscribe },
    }));

    return () => {
      unsubscribe();
      set((state) => {
        const nextSubs = { ...state.compositionSubscriptions };
        delete nextSubs[key];
        return { compositionSubscriptions: nextSubs };
      });
    };
  },

  fetchCompositionDefaults: async ({ phase, championshipType }) => {
    try {
      set((state) => ({
        defaultsLoading: {
          ...state.defaultsLoading,
          [championshipType]: {
            ...state.defaultsLoading[championshipType],
            [phase]: true,
          },
        },
        defaultsError: {
          ...state.defaultsError,
          [championshipType]: {
            ...state.defaultsError[championshipType],
            [phase]: null,
          },
        },
      }));

      const defaults = await compositionDefaultsService.getDefaults(
        phase,
        championshipType
      );

      set((state) => ({
        defaultsByChampionship: {
          ...state.defaultsByChampionship,
          [championshipType]: {
            ...state.defaultsByChampionship[championshipType],
            [phase]: defaults,
          },
        },
        defaultsLoading: {
          ...state.defaultsLoading,
          [championshipType]: {
            ...state.defaultsLoading[championshipType],
            [phase]: false,
          },
        },
      }));
    } catch (error) {
      set((state) => ({
        defaultsError: {
          ...state.defaultsError,
          [championshipType]: {
            ...state.defaultsError[championshipType],
            [phase]: error instanceof Error ? error.message : "Erreur inconnue",
          },
        },
        defaultsLoading: {
          ...state.defaultsLoading,
          [championshipType]: {
            ...state.defaultsLoading[championshipType],
            [phase]: false,
          },
        },
      }));
    }
  },
}));

export const getAvailabilityByDay = (
  state: TeamManagementState,
  params: { journee: number; phase: "aller" | "retour"; championshipType: ChampionshipType; idEpreuve?: number }
) => state.availabilityByKey[getDayKey(params)];

export const getCompositionByDay = (
  state: TeamManagementState,
  params: { journee: number; phase: "aller" | "retour"; championshipType: ChampionshipType }
) => state.compositionsByKey[getDayKey(params)];

