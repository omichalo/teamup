import { useEffect, useState } from "react";
import { Player } from "@/types";

export const usePlayers = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true);

        const response = await fetch("/api/players");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const playersData = data.players || [];

        setPlayers(
          playersData.map((player: any) => ({
            ...player,
            createdAt: player.createdAt
              ? new Date(player.createdAt)
              : new Date(),
            updatedAt: player.updatedAt
              ? new Date(player.updatedAt)
              : new Date(),
          }))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  return { players, loading, error };
};
