import { useState, useEffect } from "react";
import { Match, Team } from "@/types";

interface FFTTData {
  matches: Match[];
  teams: Team[];
  loading: boolean;
  error: string | null;
}

export const useFFTTData = () => {
  const [data, setData] = useState<FFTTData>({
    matches: [],
    teams: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchFFTTData = async () => {
      try {
        setData((prev) => ({ ...prev, loading: true, error: null }));

        // Récupérer les données depuis l'API FFTT
        const response = await fetch("/api/fftt/matches?clubCode=08781477");

        if (!response.ok) {
          throw new Error(`Erreur API FFTT: ${response.status}`);
        }

        const ffttMatches = await response.json();
        console.log(
          `${ffttMatches.length} équipes récupérées depuis l'API FFTT`
        );

        // Transformer les données FFTT en format interne
        const transformedMatches: Match[] = ffttMatches.map(
          (ffttMatch: any) => ({
            id: ffttMatch.ffttId,
            ffttId: ffttMatch.ffttId,
            teamNumber: ffttMatch.teamNumber,
            opponent: ffttMatch.opponent,
            opponentClub: ffttMatch.opponentClub,
            date: new Date(ffttMatch.date),
            location: ffttMatch.location,
            isHome: ffttMatch.isHome,
            isExempt: ffttMatch.isExempt,
            isForfeit: ffttMatch.isForfeit,
            phase: ffttMatch.phase,
            journee: ffttMatch.journee,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        );

        // Créer les équipes basées sur les données FFTT
        const transformedTeams: Team[] = ffttMatches.map((ffttMatch: any) => ({
          id: `sqyping_team_${ffttMatch.teamNumber}`,
          number: ffttMatch.teamNumber,
          name: `SQY PING ${ffttMatch.teamNumber}`,
          division: extractDivisionFromOpponent(ffttMatch.opponent),
          players: [], // Les joueurs seront ajoutés par le système asynchrone
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        setData({
          matches: transformedMatches,
          teams: transformedTeams,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error("Erreur récupération données FFTT:", error);
        setData((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : "Erreur inconnue",
        }));
      }
    };

    fetchFFTTData();
  }, []);

  return data;
};

// Fonction helper pour extraire la division depuis le nom de l'équipe
const extractDivisionFromOpponent = (opponent: string): string => {
  if (opponent.includes("Nationale 2")) return "Nationale 2";
  if (opponent.includes("PN")) return "Pré-Nationale";
  if (opponent.includes("R1")) return "Régionale 1";
  if (opponent.includes("R2")) return "Régionale 2";
  if (opponent.includes("R3")) return "Régionale 3";
  if (opponent.includes("Départementale 1")) return "Départementale 1";
  if (opponent.includes("Départementale 2")) return "Départementale 2";
  if (opponent.includes("Départementale 3")) return "Départementale 3";
  if (opponent.includes("Départementale 4")) return "Départementale 4";
  if (opponent.includes("Pre-Regionale")) return "Pré-Régionale";
  return "Division inconnue";
};
