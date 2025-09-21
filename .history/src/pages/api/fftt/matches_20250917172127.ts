import { NextApiRequest, NextApiResponse } from "next";
import { FFTTAPI } from "@omichalo/ffttapi-node";
import { FFTTMatch } from "@/types";

const ffttApi = new FFTTAPI(
  process.env.ID_FFTT || "SW251",
  process.env.PWD_FFTT || "XpZ31v56Jr"
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { clubCode, teamNumber } = req.query;

  if (!clubCode) {
    return res.status(400).json({ error: "Club code parameter is required" });
  }

  try {
    // Initialiser l'API FFTT
    await ffttApi.initialize();
    
    // Récupérer les détails du club
    const clubDetails = await ffttApi.getClubDetails(clubCode as string);
    console.log("Club details:", clubDetails);
    
    // Récupérer les équipes du club
    const equipes = await ffttApi.getEquipesByClub(clubCode as string);
    console.log("Équipes:", equipes);
    
    // Créer des données de test basées sur le club et les équipes
    const matches = equipes.map((equipe, index) => ({
      ffttId: `club_${clubCode}_equipe_${index + 1}`,
      teamNumber: index + 1,
      opponent: `Équipe ${index + 1} - ${clubDetails.nom}`,
      opponentClub: clubDetails.nom,
      date: new Date(),
      location: "SQY Ping",
      isHome: true,
      isExempt: false,
      isForfeit: false,
      phase: "aller",
      journee: 1,
    }));

    if (!matches || matches.length === 0) {
      return res.status(404).json({ error: "No matches found for this club" });
    }

    // Filtrer par équipe si spécifié
    let filteredMatches = matches;
    if (teamNumber) {
      filteredMatches = matches.filter(
        (match) =>
          match.equipe.includes(`Equipe ${teamNumber}`) ||
          match.equipe.includes(`Équipe ${teamNumber}`)
      );
    }

    // Transformer les données au format interne
    const transformedMatches: FFTTMatch[] = filteredMatches.map((match) => ({
      ffttId: match.id || `${match.date}_${match.equipe}`,
      teamNumber: extractTeamNumber(match.equipe),
      opponent: match.adversaire,
      opponentClub: extractClubName(match.adversaire),
      date: new Date(`${match.date} ${match.heure}`),
      location: match.lieu,
      isHome: match.domicile,
      isExempt: match.adversaire.toLowerCase().includes("exempt"),
      isForfeit: match.adversaire.toLowerCase().includes("forfait"),
      phase: determinePhase(match.date),
      journee: match.journee || 1,
    }));

    // Trier par date
    transformedMatches.sort((a, b) => a.date.getTime() - b.date.getTime());

    res.status(200).json(transformedMatches);
  } catch (error) {
    console.error("FFTT API Error:", error);
    res.status(500).json({
      error: "Failed to fetch matches data",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// Helper functions
function extractTeamNumber(teamName: string): number {
  const match = teamName.match(/équipe\s*(\d+)/i);
  return match ? parseInt(match[1]) : 1;
}

function extractClubName(opponent: string): string {
  // Extraire le nom du club depuis "Club - Équipe X"
  const parts = opponent.split(" - ");
  return parts[0] || opponent;
}

function determinePhase(dateString: string): string {
  const date = new Date(dateString);
  const month = date.getMonth() + 1;

  // Logique simplifiée pour déterminer la phase
  if (month >= 9 && month <= 12) {
    return "aller";
  } else if (month >= 1 && month <= 3) {
    return "retour";
  } else {
    return "playoffs";
  }
}
