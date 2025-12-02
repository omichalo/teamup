import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Player } from "@/types/team-management";
import type { EquipeWithMatches } from "@/hooks/useEquipesWithMatches";
import type { DiscordMember } from "@/types/discord";

/**
 * Store global pour les données partagées entre toutes les pages
 */
interface AppDataState {
  // Données
  players: Player[];
  equipes: EquipeWithMatches[];
  discordMembers: DiscordMember[];
  discordChannels: Array<{ id: string; name: string; type?: number }>;
  locations: Array<{ id: string; name: string }>;

  // États de chargement
  loading: {
    players: boolean;
    equipes: boolean;
    discordMembers: boolean;
    discordChannels: boolean;
    locations: boolean;
  };

  // Erreurs
  errors: {
    players: string | null;
    equipes: string | null;
    discordMembers: string | null;
    discordChannels: string | null;
    locations: string | null;
  };

  // Timestamps de dernière mise à jour (pour cache/invalidation)
  lastUpdated: {
    players: number | null;
    equipes: number | null;
    discordMembers: number | null;
    discordChannels: number | null;
    locations: number | null;
  };


  // Actions pour mettre à jour les données
  setPlayers: (players: Player[]) => void;
  setEquipes: (equipes: EquipeWithMatches[]) => void;
  setDiscordMembers: (members: DiscordMember[]) => void;
  setDiscordChannels: (channels: Array<{ id: string; name: string; type?: number }>) => void;
  setLocations: (locations: Array<{ id: string; name: string }>) => void;

  // Actions pour les états de chargement
  setLoading: (key: keyof AppDataState["loading"], loading: boolean) => void;
  setError: (key: keyof AppDataState["errors"], error: string | null) => void;

  // Actions pour réinitialiser
  reset: () => void;
}

const initialState = {
  players: [],
  equipes: [],
  discordMembers: [],
  discordChannels: [],
  locations: [],
  loading: {
    players: false,
    equipes: false,
    discordMembers: false,
    discordChannels: false,
    locations: false,
  },
  errors: {
    players: null,
    equipes: null,
    discordMembers: null,
    discordChannels: null,
    locations: null,
  },
  lastUpdated: {
    players: null,
    equipes: null,
    discordMembers: null,
    discordChannels: null,
    locations: null,
  },
};

export const useAppStore = create<AppDataState>()(
  devtools(
    (set) => ({
      ...initialState,

      setPlayers: (players) =>
        set(
          {
            players,
            lastUpdated: { ...initialState.lastUpdated, players: Date.now() },
            errors: { ...initialState.errors, players: null },
          },
          false,
          "setPlayers"
        ),

      setEquipes: (equipes) =>
        set(
          {
            equipes,
            lastUpdated: { ...initialState.lastUpdated, equipes: Date.now() },
            errors: { ...initialState.errors, equipes: null },
          },
          false,
          "setEquipes"
        ),

      setDiscordMembers: (discordMembers) =>
        set(
          {
            discordMembers,
            lastUpdated: {
              ...initialState.lastUpdated,
              discordMembers: Date.now(),
            },
            errors: { ...initialState.errors, discordMembers: null },
          },
          false,
          "setDiscordMembers"
        ),

      setDiscordChannels: (discordChannels) =>
        set(
          {
            discordChannels,
            lastUpdated: {
              ...initialState.lastUpdated,
              discordChannels: Date.now(),
            },
            errors: { ...initialState.errors, discordChannels: null },
          },
          false,
          "setDiscordChannels"
        ),

      setLocations: (locations) =>
        set(
          {
            locations,
            lastUpdated: {
              ...initialState.lastUpdated,
              locations: Date.now(),
            },
            errors: { ...initialState.errors, locations: null },
          },
          false,
          "setLocations"
        ),

      setLoading: (key, loading) =>
        set(
          (state) => ({
            loading: { ...state.loading, [key]: loading },
          }),
          false,
          `setLoading/${key}`
        ),

      setError: (key, error) =>
        set(
          (state) => ({
            errors: { ...state.errors, [key]: error },
            loading: { ...state.loading, [key]: false },
          }),
          false,
          `setError/${key}`
        ),

      reset: () => set(initialState, false, "reset"),
    }),
    { name: "AppStore" }
  )
);

