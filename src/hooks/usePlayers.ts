import { useEffect, useRef } from "react";
import { useTeamManagementStore } from "@/stores/teamManagementStore";

export const usePlayers = () => {
  const players = useTeamManagementStore((state) => state.players);
  const playersLoading = useTeamManagementStore((state) => state.playersLoading);
  const playersError = useTeamManagementStore((state) => state.playersError);
  const loadPlayers = useTeamManagementStore((state) => state.loadPlayers);
  
  // Utiliser une ref pour éviter les appels multiples
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!hasLoadedRef.current && !players.length && !playersLoading && !playersError) {
      hasLoadedRef.current = true;
      void loadPlayers();
    }
  }, [loadPlayers, players.length, playersError, playersLoading]);

  return { players, loading: playersLoading, error: playersError };
};
