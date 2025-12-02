import { useEffect } from "react";
import { useAppStore } from "@/stores/app-store";
import { useEquipesWithMatches } from "./useEquipesWithMatches";
import { useDiscordMembers as useDiscordMembersHook } from "./useDiscordMembers";

/**
 * Hook pour charger et synchroniser les données partagées dans le store Zustand
 * Utilise les hooks existants mais synchronise avec le store global
 */
export function useAppData() {
  const {
    equipes,
    setEquipes,
    loading: storeLoading,
    setLoading,
    setError,
  } = useAppStore();

  // Charger les équipes via le hook existant et synchroniser avec le store
  const {
    equipes: hookEquipes,
    loading: hookLoading,
    error: hookError,
  } = useEquipesWithMatches();

  // Synchroniser les équipes avec le store
  useEffect(() => {
    if (hookEquipes.length > 0 || hookLoading) {
      setEquipes(hookEquipes);
    }
  }, [hookEquipes, hookLoading, setEquipes]);

  useEffect(() => {
    setLoading("equipes", hookLoading);
  }, [hookLoading, setLoading]);

  useEffect(() => {
    setError("equipes", hookError);
  }, [hookError, setError]);

  return {
    equipes: equipes.length > 0 ? equipes : hookEquipes,
    loading: storeLoading.equipes || hookLoading,
    error: hookError,
  };
}

/**
 * Hook pour charger les membres Discord dans le store
 */
export function useDiscordMembers() {
  const {
    discordMembers,
    setDiscordMembers,
  } = useAppStore();

  // Utiliser le hook existant
  const hookMembers = useDiscordMembersHook();

  // Synchroniser avec le store
  useEffect(() => {
    if (hookMembers && hookMembers.length > 0) {
      setDiscordMembers(hookMembers);
    }
  }, [hookMembers, setDiscordMembers]);

  // Charger depuis le store si disponible, sinon utiliser le hook
  return discordMembers.length > 0 ? discordMembers : hookMembers;
}

/**
 * Hook pour accéder aux locations depuis le store (chargées par useAppDataLoader)
 */
export function useLocations() {
  const { locations } = useAppStore();
  return locations;
}

