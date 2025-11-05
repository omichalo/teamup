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

        // Récupérer les données depuis Firestore
        const response = await fetch(
          "/api/fftt/real-matches?clubCode=08781477"
        );

        if (!response.ok) {
          throw new Error(`Erreur API: ${response.status}`);
        }

        const data = await response.json();
        const ffttMatches = data.matches || [];
        console.log(`${ffttMatches.length} matchs récupérés depuis Firestore`);

        // Transformer les données FFTT en format interne
        const transformedMatches: Match[] = ffttMatches.map(
          (ffttMatch: {
            ffttId: string;
            teamNumber: number;
            opponent: string;
            opponentClub: string;
            date: string;
            location: string;
            isHome: boolean;
            isExempt: boolean;
            isForfeit: boolean;
            result?: string;
            score?: string;
            joueursSQY?: unknown[];
            joueursAdversaires?: unknown[];
            resultatsIndividuels?: unknown;
          }) => ({
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
            phase:
              "phase" in ffttMatch && typeof ffttMatch.phase === "string"
                ? (ffttMatch.phase as "aller" | "retour")
                : "aller",
            journee:
              "journee" in ffttMatch && typeof ffttMatch.journee === "number"
                ? ffttMatch.journee
                : 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        );

        // Récupérer les équipes depuis Firestore
        const teamsResponse = await fetch("/api/teams");
        if (!teamsResponse.ok) {
          throw new Error(`Erreur API équipes: ${teamsResponse.status}`);
        }
        const teamsData = await teamsResponse.json();
        const transformedTeams: Team[] = teamsData.teams || [];

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

// Fonction helper pour extraire la division depuis le nom de l&apos;équipe
// const _extractDivisionFromOpponent = (opponent: string): string => {
//   if (opponent.includes("Nationale 2")) return "Nationale 2";
//   if (opponent.includes("PN")) return "Pré-Nationale";
//   if (opponent.includes("R1")) return "Régionale 1";
//   if (opponent.includes("R2")) return "Régionale 2";
//   if (opponent.includes("R3")) return "Régionale 3";
//   if (opponent.includes("Départementale 1")) return "Départementale 1";
//   if (opponent.includes("Départementale 2")) return "Départementale 2";
//   if (opponent.includes("Départementale 3")) return "Départementale 3";
//   if (opponent.includes("Départementale 4")) return "Départementale 4";
//   if (opponent.includes("Pre-Regionale")) return "Pré-Régionale";
//   return "Division inconnue";
// };
