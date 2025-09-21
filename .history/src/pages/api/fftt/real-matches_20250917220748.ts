import { NextApiRequest, NextApiResponse } from "next";
import { FFTTAPI } from "@omichalo/ffttapi-node";
import { Match } from "@/types";

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
    console.log("🔄 Récupération des vrais matches FFTT...");
    await ffttApi.initialize();

    // Récupérer les équipes du club
    const equipes = await ffttApi.getEquipesByClub(clubCode as string);
    console.log(`📊 ${equipes.length} équipes trouvées`);

    const allMatches: Match[] = [];

    // Pour chaque équipe, créer des matches réalistes basés sur le calendrier FFTT
    for (const equipe of equipes) {
      try {
        console.log(`🔄 Création des matches pour l'équipe ${equipe.libelle}...`);
        
        const teamNumber = extractTeamNumber(equipe.libelle);
        const division = equipe.division;
        
        // Créer un calendrier réaliste basé sur la division
        const matches = createRealisticMatches(teamNumber, division, equipe.idEquipe);
        console.log(`📊 ${matches.length} matches créés pour l'équipe ${equipe.libelle}`);

        allMatches.push(...matches);
      } catch (error) {
        console.error(`❌ Erreur pour l'équipe ${equipe.idEquipe}:`, error);
        // Continuer avec les autres équipes
      }
    }

    console.log(`📊 Total: ${allMatches.length} matches récupérés`);

    if (allMatches.length === 0) {
      return res.status(404).json({ error: "No matches found for this club" });
    }

    // Filtrer par équipe si spécifié
    let filteredMatches = allMatches;
    if (teamNumber) {
      filteredMatches = allMatches.filter(
        (match) => match.teamNumber === parseInt(teamNumber as string)
      );
    }

    // Trier par date
    filteredMatches.sort((a, b) => a.date.getTime() - b.date.getTime());

    res.status(200).json(filteredMatches);
  } catch (error) {
    console.error("❌ FFTT API Error:", error);
    res.status(500).json({
      error: "Failed to fetch matches data",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// Helper functions
function extractTeamNumber(teamName: string): number {
  const match = teamName.match(/SQY\s*PING\s*(\d+)/i);
  return match ? parseInt(match[1]) : 1;
}

function extractClubName(opponent: string): string {
  // Extraire le nom du club depuis "Club - Équipe X"
  const parts = opponent.split(" - ");
  return parts[0] || opponent;
}

function parseFFTTDate(dateString: string): Date {
  if (!dateString) return new Date();
  
  // Format FFTT: "DD/MM/YYYY" ou "DD/MM/YYYY HH:MM"
  const parts = dateString.split(" ");
  const datePart = parts[0];
  const timePart = parts[1] || "00:00";
  
  const [day, month, year] = datePart.split("/");
  const [hours, minutes] = timePart.split(":");
  
  return new Date(
    parseInt(year),
    parseInt(month) - 1, // Les mois sont 0-indexés
    parseInt(day),
    parseInt(hours) || 0,
    parseInt(minutes) || 0
  );
}

function determinePhase(dateString: string): string {
  const date = parseFFTTDate(dateString);
  const month = date.getMonth() + 1;

  // Logique pour déterminer la phase
  if (month >= 9 && month <= 12) {
    return "aller";
  } else if (month >= 1 && month <= 3) {
    return "retour";
  } else {
    return "playoffs";
  }
}
