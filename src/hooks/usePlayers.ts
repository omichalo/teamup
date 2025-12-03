import { useEffect } from "react";
import { useTeamManagementStore } from "@/stores/teamManagementStore";

export const usePlayers = () => {
  const { players, playersLoading, playersError, loadPlayers } =
    useTeamManagementStore((state) => ({
      players: state.players,
      playersLoading: state.playersLoading,
      playersError: state.playersError,
      loadPlayers: state.loadPlayers,
    }));

  useEffect(() => {
    if (!players.length && !playersLoading && !playersError) {
      void loadPlayers();
    }
  }, [loadPlayers, players.length, playersError, playersLoading]);

  return { players, loading: playersLoading, error: playersError };
};
