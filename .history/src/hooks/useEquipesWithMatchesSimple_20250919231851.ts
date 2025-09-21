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

export const useEquipesWithMatchesSimple = (clubCode: string = "08781477") => {
  const [data, setData] = useState<EquipesWithMatchesData>({
    equipes: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchEquipesWithMatches = async () => {
      try {
        console.log("🔄 Début du fetch des équipes...");
        setData((prev) => ({ ...prev, loading: true, error: null }));

        // Test simple avec une seule équipe
        const teamId = "8551"; // SQY PING 16
        
        // Récupérer l'équipe
        const teamResponse = await fetch(`http://localhost:3000/api/teams`);
        console.log("✅ Équipes récupérées");
        const teamsData = await teamResponse.json();
        const team = teamsData.teams.find((t: any) => t.id === teamId);
        
        if (!team) {
          throw new Error("Team not found");
        }

        // Récupérer les matchs de l'équipe
        const matchesResponse = await fetch(`http://localhost:3000/api/teams/${teamId}/matches`);
        console.log("✅ Matchs récupérés");
        const matchesData = await matchesResponse.json();
        const matches: Match[] = matchesData.matches || [];

        const equipeWithMatches: EquipeWithMatches = {
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
        };

        console.log("✅ Données prêtes:", equipeWithMatches);

        setData({
          equipes: [equipeWithMatches],
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
