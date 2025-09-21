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

  const { clubCode } = req.query;

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

    const allMatches: Match[] = [];

    // Pour chaque équipe, récupérer ses matchs
    for (const equipe of equipes) {
      try {
        console.log(`Récupération des matchs pour l'équipe: ${equipe.libelle}`);
        
        // Récupérer les matchs de la poule
        const rencontres = await ffttApi.getRencontrePouleByLienDivision(equipe.lienDivision);
        console.log(`Matchs trouvés pour ${equipe.libelle}:`, rencontres.length);

        // Transformer les rencontres en objets Match
        for (const rencontre of rencontres) {
          const teamNumber = extractTeamNumber(equipe.libelle);
          const phase = determinePhaseFromDivision(equipe.division);
          
          // Extraire les informations des équipes depuis le lien
          const lien = rencontre.lien || "";
          const equip1Match = lien.match(/equip_1=([^&]+)/);
          const equip2Match = lien.match(/equip_2=([^&]+)/);
          
          const equip1 = equip1Match ? decodeURIComponent(equip1Match[1].replace(/\+/g, ' ')) : "";
          const equip2 = equip2Match ? decodeURIComponent(equip2Match[1].replace(/\+/g, ' ')) : "";
          
          // Déterminer si c'est un match à domicile ou extérieur
          const isHome = equip1.includes("SQY PING");
          
          // Déterminer l'adversaire
          const opponent = isHome ? equip2 : equip1;
          
          // Extraire le nom du club adverse
          const opponentClub = extractClubName(opponent);
          
          // Déterminer la journée
          const journee = rencontre.journee || 1;
          
          // Parser la date
          let matchDate: Date;
          if (rencontre.dateprevi) {
            matchDate = new Date(rencontre.dateprevi);
          } else if (rencontre.daterencontre) {
            matchDate = new Date(rencontre.daterencontre);
          } else {
            // Si aucune date n'est disponible, utiliser une date par défaut basée sur la saison
            const currentYear = new Date().getFullYear();
            const seasonStart = new Date(currentYear, 8, 1); // Septembre
            const journeeOffset = (journee - 1) * 7; // 7 jours entre chaque journée
            matchDate = new Date(seasonStart.getTime() + journeeOffset * 24 * 60 * 60 * 1000);
          }

          const match: Match = {
            ffttId: rencontre.lien || `match_${equipe.idEquipe}_${journee}`,
            teamNumber: teamNumber,
            opponent: opponent,
            opponentClub: opponentClub,
            date: matchDate,
            location: isHome ? "SQY Ping" : opponentClub,
            isHome: isHome,
            isExempt: rencontre.libequipeA === "EXEMPT" || rencontre.libequipeB === "EXEMPT",
            isForfeit: rencontre.scoreA === "W.O." || rencontre.scoreB === "W.O.",
            phase: phase,
            journee: journee,
          };

          allMatches.push(match);
        }
      } catch (equipeError) {
        console.error(`Erreur pour l'équipe ${equipe.libelle}:`, equipeError);
        // Continuer avec les autres équipes
      }
    }

    if (allMatches.length === 0) {
      return res.status(404).json({ error: "No matches found for this club" });
    }

    // Trier par date
    allMatches.sort((a, b) => a.date.getTime() - b.date.getTime());

    console.log(`Total des matchs récupérés: ${allMatches.length}`);
    res.status(200).json(allMatches);
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
  const match = teamName.match(/SQY PING\s*(\d+)/i);
  return match ? parseInt(match[1]) : 1;
}

function extractClubName(opponent: string): string {
  // Extraire le nom du club depuis "Club - Équipe X"
  const parts = opponent.split(" - ");
  return parts[0] || opponent;
}

function determinePhaseFromDivision(division: string): string {
  if (division.includes("Nationale")) return "aller";
  if (division.includes("R1") || division.includes("R2") || division.includes("R3")) return "aller";
  if (division.includes("Departementale")) return "aller";
  return "aller";
}