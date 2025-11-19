import { useState, useEffect } from "react";
import { Match, Team } from "@/types";
import { transformAggregatedTeamEntry } from "@/lib/client/team-match-transform";

interface EquipeWithMatches {
  team: Team;
  matches: Match[];
}

interface EquipesWithMatchesData {
  equipes: EquipeWithMatches[];
  loading: boolean;
  error: string | null;
}

export const useEquipesWithMatchesSimple = () => {
  const [data, setData] = useState<EquipesWithMatchesData>({
    equipes: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchEquipesWithMatches = async () => {
      try {
        setData((prev) => ({ ...prev, loading: true, error: null }));

        const teamId = "8551"; // SQY PING 16 (exemple)

        const response = await fetch(`/api/teams/matches?teamIds=${teamId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        const entry = Array.isArray(result.teams)
          ? result.teams.find((item: { team: { id: string } }) => {
              return item.team?.id === teamId;
            })
          : null;

        if (!entry) {
          throw new Error("Team not found");
        }

        const transformed = transformAggregatedTeamEntry(entry);

        setData({
          equipes: [transformed],
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error("❌ Error fetching equipes with matches:", error);
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
