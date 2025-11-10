import { useState, useEffect } from "react";
import { Match, Team } from "@/types";
import { transformAggregatedTeamEntry } from "@/lib/client/team-match-transform";

export interface EquipeWithMatches {
  team: Team;
  matches: Match[];
}

interface EquipesWithMatchesData {
  equipes: EquipeWithMatches[];
  loading: boolean;
  error: string | null;
}

export const useEquipesWithMatches = () => {
  const [data, setData] = useState<EquipesWithMatchesData>({
    equipes: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchEquipesWithMatches = async () => {
      try {
        setData((prev) => ({ ...prev, loading: true, error: null }));

        const response = await fetch("/api/teams/matches");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        const aggregated = Array.isArray(result.teams) ? result.teams : [];

        const equipesWithMatches: EquipeWithMatches[] = aggregated.map(
          (entry: { team: unknown; matches: unknown[] }) =>
            transformAggregatedTeamEntry(entry as any)
        );

        const sortedEquipes = equipesWithMatches.sort((a, b) => {
          const numA = a.team.number || 0;
          const numB = b.team.number || 0;
          return numA - numB;
        });

        setData({
          equipes: sortedEquipes,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error("Error fetching equipes with matches:", error);
        setData((prev) => ({
          ...prev,
          loading: false,
          error:
            error instanceof Error ? error.message : "Failed to fetch data",
        }));
      }
    };

    fetchEquipesWithMatches();
  }, []);

  return data;
};
