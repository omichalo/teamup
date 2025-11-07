import { useEffect, useState } from "react";
import { Match } from "@/types";

export const useTeamMatches = (teamId: string | null) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) {
      setMatches([]);
      return;
    }

    const fetchMatches = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/teams/${teamId}/matches`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const matchesData = data.matches || [];

        const formattedMatches: Match[] = matchesData.map((match: any) => ({
          ...match,
          date: match.date ? new Date(match.date) : new Date(),
        }));

        setMatches(formattedMatches);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [teamId]);

  return { matches, loading, error };
};
