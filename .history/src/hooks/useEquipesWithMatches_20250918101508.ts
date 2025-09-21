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

        // Récupérer les données depuis l'API
        const response = await fetch(
          `/api/fftt/real-matches?clubCode=${clubCode}`
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const matches: Match[] = await response.json();

        // Grouper les matchs par équipe (en utilisant teamId pour distinguer M/F)
        const equipesMap = new Map<string, EquipeWithMatches>();

        matches.forEach((match) => {
          const teamId =
            match.teamId || `${match.teamNumber}_${match.isFemale ? "F" : "M"}`;
          const teamNumber = match.teamNumber;
          const isFemale = match.isFemale || false;

          if (!equipesMap.has(teamId)) {
            const teamName = `SQY PING ${teamNumber}`;
            const divisionName = match.division || "Division inconnue";
            equipesMap.set(teamId, {
              team: {
                id: `team_${teamId}`,
                name: teamName,
                division: divisionName,
                players: [],
                coach: "",
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              matches: [],
            });
          }

          equipesMap.get(teamId)!.matches.push(match);
        });

        // Convertir en array et trier par numéro d'équipe (numérique)
        const equipesArray = Array.from(equipesMap.values()).sort((a, b) => {
          const numA = parseInt(
            a.team.name.match(/SQY PING (\d+)/)?.[1] || "0"
          );
          const numB = parseInt(
            b.team.name.match(/SQY PING (\d+)/)?.[1] || "0"
          );
          return numA - numB;
        });

        setData({
          equipes: equipesArray,
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

    if (clubCode) {
      fetchEquipesWithMatches();
    } else {
      setData((prev) => ({
        ...prev,
        loading: false,
        error: "Club code is required",
      }));
    }
  }, [clubCode]);

  return data;
};
