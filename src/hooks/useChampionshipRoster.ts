"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchChampionshipRoster } from "@/lib/championship/client";
import { mergePlayersWithChampionshipRoster } from "@/lib/championship/merge-players";
import type { ChampionshipRosterView } from "@/lib/championship/merge-players";
import type { Player } from "@/types/team-management";

export function useChampionshipRoster(players: Player[]) {
  const [roster, setRoster] = useState<ChampionshipRosterView[]>([]);
  const [seasonLabel, setSeasonLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchChampionshipRoster();
      setRoster(result.roster);
      setSeasonLabel(result.seasonLabel);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur effectif");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const mergedPlayers = loaded
    ? mergePlayersWithChampionshipRoster(players, roster)
    : players;

  return { mergedPlayers, roster, seasonLabel, loading, error, reload };
}
