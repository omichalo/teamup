import { useEffect, useState } from "react";
import { Team } from "@/types";

export const useTeams = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true);

        const response = await fetch("/api/teams");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const teamsData = data.teams || [];

        setTeams(
          teamsData.map((team: any) => ({
            ...team,
            createdAt: team.createdAt ? new Date(team.createdAt) : new Date(),
            updatedAt: team.updatedAt ? new Date(team.updatedAt) : new Date(),
          }))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  return { teams, loading, error };
};
