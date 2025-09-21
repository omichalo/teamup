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
        const rencontres = await ffttApi.getRencontrePouleByLienDivision(
          equipe.lienDivision
        );
        console.log(
          `Matchs trouvés pour ${equipe.libelle}:`,
          rencontres.length
        );

        // Transformer les rencontres en objets Match
        for (let index = 0; index < rencontres.length; index++) {
          const rencontre = rencontres[index];
          const teamNumber = extractTeamNumber(equipe.libelle);
          const phase = determinePhaseFromDivision(equipe.division);

          // Debug: afficher les données brutes de la rencontre (temporaire)
          // console.log(`Debug rencontre pour ${equipe.libelle}:`, {
          //   rencontre: rencontre,
          //   lien: rencontre.lien,
          //   keys: Object.keys(rencontre),
          // });

          // Utiliser les vraies données des équipes de l'API FFTT
          const equip1 = rencontre.nomEquipeA || "";
          const equip2 = rencontre.nomEquipeB || "";

          // FILTRER : Ne garder que les matchs où SQY PING joue
          const sqyPingInMatch =
            equip1.includes("SQY PING") || equip2.includes("SQY PING");
          if (!sqyPingInMatch) {
            continue; // Ignorer les matchs entre autres équipes
          }

          // Déterminer si c'est un match à domicile ou extérieur
          const isHome = equip1.includes("SQY PING");

          // Déterminer l'adversaire
          const opponent = isHome ? equip2 : equip1;

          // Extraire le nom du club adverse
          const opponentClub = extractClubName(opponent);

          // Déterminer la journée - extraire depuis le libelle (ex: "tour n°5")
          let journee = 1;
          const tourMatch = rencontre.libelle?.match(/tour n°(\d+)/);
          if (tourMatch) {
            journee = parseInt(tourMatch[1]);
          }

          // Parser la date - utiliser les propriétés correctes de l'API FFTT
          let matchDate: Date;

          // Utiliser les vraies dates de l'API FFTT
          if (
            rencontre.dateReelle &&
            rencontre.dateReelle !== "0000-00-00" &&
            rencontre.dateReelle !== "0000-00-00 00:00:00"
          ) {
            matchDate = new Date(rencontre.dateReelle);
          } else if (
            rencontre.datePrevue &&
            rencontre.datePrevue !== "0000-00-00" &&
            rencontre.datePrevue !== "0000-00-00 00:00:00"
          ) {
            matchDate = new Date(rencontre.datePrevue);
          } else {
            // Fallback si aucune date n'est disponible
            const currentYear = new Date().getFullYear();
            const seasonStart = new Date(currentYear, 8, 1); // 1er septembre
            const journeeOffset = (journee - 1) * 7; // 7 jours entre chaque journée
            matchDate = new Date(
              seasonStart.getTime() + journeeOffset * 24 * 60 * 60 * 1000
            );
            // Pas d'heure si pas de données réelles
            matchDate.setHours(0, 0, 0, 0);
          }

          const match: Match = {
            ffttId: rencontre.lien || `match_${equipe.idEquipe}_${journee}`,
            teamNumber: teamNumber,
            opponent: opponent,
            opponentClub: opponentClub,
            date: matchDate,
            location: isHome ? "SQY Ping" : opponentClub,
            isHome: isHome,
            isExempt:
              rencontre.libequipeA === "EXEMPT" ||
              rencontre.libequipeB === "EXEMPT",
            isForfeit:
              rencontre.scoreA === "W.O." || rencontre.scoreB === "W.O.",
            phase: phase,
            journee: journee,
            // Ajouter des métadonnées pour distinguer les équipes
            isFemale: isFemaleTeam(equipe.division),
            division: equipe.division,
            // Créer un identifiant unique pour l'équipe (numéro + genre)
            teamId: `${teamNumber}_${
              isFemaleTeam(equipe.division) ? "F" : "M"
            }`,
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

function isFemaleTeam(division: string): boolean {
  return division.includes("Dames") || division.includes("Féminin");
}

function extractClubName(opponent: string): string {
  // Extraire le nom du club depuis "Club - Équipe X"
  const parts = opponent.split(" - ");
  return parts[0] || opponent;
}

function determinePhaseFromDivision(division: string): string {
  if (division.includes("Nationale")) return "aller";
  if (
    division.includes("R1") ||
    division.includes("R2") ||
    division.includes("R3")
  )
    return "aller";
  if (division.includes("Departementale")) return "aller";
  return "aller";
}
