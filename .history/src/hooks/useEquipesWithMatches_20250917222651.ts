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

        // Grouper les matchs par équipe
        const equipesMap = new Map<number, EquipeWithMatches>();

        matches.forEach((match) => {
          const teamNumber = match.teamNumber;

          if (!equipesMap.has(teamNumber)) {
            equipesMap.set(teamNumber, {
              team: {
                id: `team_${teamNumber}`,
                name: `SQY PING ${teamNumber}`,
                division: "Division inconnue",
                players: [],
                coach: "",
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              matches: [],
            });
          }

          equipesMap.get(teamNumber)!.matches.push(match);
        });

        // Convertir en array et trier par numéro d'équipe
        const equipesArray = Array.from(equipesMap.values()).sort((a, b) =>
          a.team.name.localeCompare(b.team.name)
        );

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
