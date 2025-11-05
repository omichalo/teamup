import { useState, useEffect } from "react";
import { Match, Team } from "@/types";

interface EquipeWithMatches {
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

        // Récupérer les équipes depuis Firestore
        const teamsResponse = await fetch("/api/teams");
        if (!teamsResponse.ok) {
          throw new Error(`HTTP error! status: ${teamsResponse.status}`);
        }
        const teamsData = await teamsResponse.json();
        const allTeams = teamsData.teams || teamsData.data || [];

        // Utiliser toutes les équipes
        const teams = allTeams;

        // Récupérer les matchs pour chaque équipe (en parallèle avec limitation)
        const equipesWithMatches: EquipeWithMatches[] = [];
        const batchSize = 5; // Limiter à 5 appels simultanés

        for (let i = 0; i < teams.length; i += batchSize) {
          const batch = teams.slice(i, i + batchSize);
          const batchPromises = batch.map(
            async (team: { id: string; name: string; division: string }) => {
              try {
                const matchesResponse = await fetch(
                  `/api/teams/${team.id}/matches`
                );
                if (matchesResponse.ok) {
                  const matchesData = await matchesResponse.json();
                  const matches: Match[] = (
                    matchesData.matches || matchesData.data || []
                  ).map((match: any) => ({
                    ...match,
                    date: match.date ? new Date(match.date) : new Date(),
                    createdAt: match.createdAt
                      ? new Date(match.createdAt)
                      : new Date(),
                    updatedAt: match.updatedAt
                      ? new Date(match.updatedAt)
                      : new Date(),
                    // Conserver joueursSQY et joueursAdversaires si présents
                    joueursSQY: match.joueursSQY || [],
                    joueursAdversaires: match.joueursAdversaires || [],
                  }));

                  return {
                    team: {
                      id: team.id,
                      number: team.teamNumber || 1,
                      name: team.name,
                      division: team.division || "Division inconnue",
                      players: [],
                      createdAt: team.createdAt
                        ? new Date(team.createdAt)
                        : new Date(),
                      updatedAt: team.updatedAt
                        ? new Date(team.updatedAt)
                        : new Date(),
                    },
                    matches: matches,
                  };
                } else {
                  throw new Error(`HTTP ${matchesResponse.status}`);
                }
              } catch (error) {
                console.warn(
                  `Failed to fetch matches for team ${team.id}:`,
                  error
                );
                // Retourner l&apos;équipe même sans matchs
                return {
                  team: {
                    id: team.id,
                    name: team.name,
                    division: team.division || "Division inconnue",
                    players: [],
                    coach: "",
                    createdAt: team.createdAt
                      ? new Date(team.createdAt)
                      : new Date(),
                    updatedAt: team.updatedAt
                      ? new Date(team.updatedAt)
                      : new Date(),
                  },
                  matches: [],
                };
              }
            }
          );

          const batchResults = await Promise.all(batchPromises);
          equipesWithMatches.push(...batchResults);
        }

        // Trier par numéro d&apos;équipe (numérique)
        const sortedEquipes = equipesWithMatches.sort((a, b) => {
          const numA = parseInt(
            a.team.name.match(/SQY PING (\d+)/)?.[1] || "0"
          );
          const numB = parseInt(
            b.team.name.match(/SQY PING (\d+)/)?.[1] || "0"
          );
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
