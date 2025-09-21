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

export const useEquipesWithMatches = (clubCode: string = "08781477") => {
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
        const teams = teamsData.data || [];

        // Récupérer les matchs pour chaque équipe
        const equipesWithMatches: EquipeWithMatches[] = [];

        for (const team of teams) {
          try {
            const matchesResponse = await fetch(`/api/teams/${team.id}/matches`);
            if (matchesResponse.ok) {
              const matchesData = await matchesResponse.json();
              const matches: Match[] = matchesData.data || [];

              equipesWithMatches.push({
                team: {
                  id: team.id,
                  name: team.name,
                  division: team.division || "Division inconnue",
                  players: [],
                  coach: "",
                  createdAt: team.createdAt ? new Date(team.createdAt) : new Date(),
                  updatedAt: team.updatedAt ? new Date(team.updatedAt) : new Date(),
                },
                matches: matches,
              });
            }
          } catch (error) {
            console.warn(`Failed to fetch matches for team ${team.id}:`, error);
            // Ajouter l'équipe même sans matchs
            equipesWithMatches.push({
              team: {
                id: team.id,
                name: team.name,
                division: team.division || "Division inconnue",
                players: [],
                coach: "",
                createdAt: team.createdAt ? new Date(team.createdAt) : new Date(),
                updatedAt: team.updatedAt ? new Date(team.updatedAt) : new Date(),
              },
              matches: [],
            });
          }
        }

        // Trier par numéro d'équipe (numérique)
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
