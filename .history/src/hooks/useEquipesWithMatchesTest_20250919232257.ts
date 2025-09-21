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

export const useEquipesWithMatchesTest = (clubCode: string = "08781477") => {
  const [data, setData] = useState<EquipesWithMatchesData>({
    equipes: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    console.log("🔄 Hook test démarré");

    // Simuler un délai puis retourner des données de test
    const timer = setTimeout(() => {
      console.log("✅ Hook test terminé");
      setData({
        equipes: [
          {
            team: {
              id: "test_team_1",
              name: "SQY PING 1 - Phase 1",
              division: "Test Division",
              players: [],
              coach: "",
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            matches: [
              {
                id: "test_match_1",
                ffttId: "test_match_1",
                teamId: "test_team_1",
                teamNumber: 1,
                opponent: "Équipe Test",
                opponentClub: "Club Test",
                date: new Date(),
                location: "Test Location",
                isHome: true,
                isExempt: false,
                isForfeit: false,
                phase: "aller",
                journee: "1",
                isFemale: false,
                division: "Test Division",
                epreuve: "Test Epreuve",
                result: "À VENIR",
                rencontreId: "test_rencontre_1",
                equipeIds: { equipe1: "test_team_1", equipe2: "test_opponent" },
                lienDetails: "test_lien",
                resultatsIndividuels: undefined,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
          },
        ],
        loading: false,
        error: null,
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return data;
};
