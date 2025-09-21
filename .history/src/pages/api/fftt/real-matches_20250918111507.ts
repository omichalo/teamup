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
      let matchesWithScores = 0;

      // Filtrer uniquement les épreuves qui nous intéressent (15954 et 15955)
      const equipesFiltered = equipes.filter(
        (equipe) => equipe.idEpreuve === 15954 || equipe.idEpreuve === 15955
      );
      console.log(
        `Équipes filtrées (épreuves 15954 et 15955): ${equipesFiltered.length}`
      );

    // Pour chaque équipe filtrée, récupérer ses matchs
    for (const equipe of equipesFiltered) {
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

          // Récupérer les détails seulement pour les matchs terminés (avec scores)
          let detailsRencontre = null;
          // Vérifier si le match a des scores
          const hasScore = (() => {
            // Vérifier les propriétés directes
            if (rencontre.scoreEquipeA && rencontre.scoreEquipeB) {
              return true;
            }
            // Vérifier dans le lien
            const res1Match = rencontre.lien.match(/res_1=([^&]+)/);
            const res2Match = rencontre.lien.match(/res_2=([^&]+)/);
            return res1Match && res2Match && res1Match[1] && res2Match[1];
          })();
          
          if (hasScore) {
            matchesWithScores++;
            console.log(`🔥🔥🔥 MATCH AVEC SCORE DÉTECTÉ pour ${equipe.libelle} 🔥🔥🔥`);
            console.log(`Score détecté:`, {
              scoreEquipeA: rencontre.scoreEquipeA,
              scoreEquipeB: rencontre.scoreEquipeB,
              lien: rencontre.lien
            });
            try {
              const equipeIds = extractEquipeIds(rencontre.lien);
              if (equipeIds) {
                console.log(
                  `Récupération des détails pour match terminé: ${equipeIds.equipe1} vs ${equipeIds.equipe2}`
                );
                // Utiliser getDetailsRencontreByLien avec le lien et les IDs des équipes
                detailsRencontre = await ffttApi.getDetailsRencontreByLien(
                  rencontre.lien,
                  equipeIds.equipe1,
                  equipeIds.equipe2
                );
                console.log(
                  `Détails récupérés pour match terminé:`,
                  detailsRencontre
                );
              }
            } catch (error) {
              console.log(
                `Erreur lors de la récupération des détails du match terminé:`,
                error
              );
            }
          }

          // Debug: afficher les données brutes de la rencontre (temporaire)
          if (index === 0) {
            // Seulement pour le premier match pour éviter le spam
            console.log(`Debug rencontre pour ${equipe.libelle}:`, {
              rencontre: rencontre,
              lien: rencontre.lien,
              keys: Object.keys(rencontre),
            });
          }
          
          // Debug spécial pour les rencontres avec des scores
          if (rencontre.scoreEquipeA || rencontre.scoreEquipeB || 
              (rencontre as any).scoreA || (rencontre as any).scoreB ||
              (rencontre as any).res_1 || (rencontre as any).res_2) {
            console.log(`DEBUG SCORE pour ${equipe.libelle}:`, {
              scoreEquipeA: rencontre.scoreEquipeA,
              scoreEquipeB: rencontre.scoreEquipeB,
              scoreA: (rencontre as any).scoreA,
              scoreB: (rencontre as any).scoreB,
              res_1: (rencontre as any).res_1,
              res_2: (rencontre as any).res_2,
              allKeys: Object.keys(rencontre),
              allValues: Object.values(rencontre)
            });
          }

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
            rencontre.dateReelle instanceof Date &&
            !isNaN(rencontre.dateReelle.getTime())
          ) {
            matchDate = rencontre.dateReelle;
          } else if (
            rencontre.datePrevue &&
            rencontre.datePrevue instanceof Date &&
            !isNaN(rencontre.datePrevue.getTime())
          ) {
            matchDate = rencontre.datePrevue;
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
            id: `match_${equipe.idEquipe}_${journee}_${
              rencontre.lien || "unknown"
            }`,
            ffttId: rencontre.lien || `match_${equipe.idEquipe}_${journee}`,
            teamNumber: teamNumber,
            opponent: opponent,
            opponentClub: opponentClub,
            date: matchDate,
            location: isHome ? "SQY Ping" : opponentClub,
            isHome: isHome,
            isExempt: false, // Les matchs exempts ne sont pas gérés par les scores numériques
            isForfeit: false, // Les forfaits ne sont pas gérés par les scores numériques
            phase: phase,
            journee: journee,
            // Ajouter des métadonnées pour distinguer les équipes
            isFemale: isFemaleTeam(equipe.division),
            division: equipe.division,
            // Créer un identifiant unique pour l'équipe (numéro + genre)
            teamId: `${teamNumber}_${
              isFemaleTeam(equipe.division) ? "F" : "M"
            }`,
            // Ajouter le libellé d'épreuve pour le groupement
            epreuve: equipe.libelleEpreuve,
            // Ajouter les résultats et compositions
            score: (() => {
              // Essayer d'abord les propriétés directes
              if (rencontre.scoreEquipeA && rencontre.scoreEquipeB) {
                return `${rencontre.scoreEquipeA}-${rencontre.scoreEquipeB}`;
              }
              // Sinon, essayer d'extraire du lien
              const res1Match = rencontre.lien.match(/res_1=([^&]+)/);
              const res2Match = rencontre.lien.match(/res_2=([^&]+)/);
              if (res1Match && res2Match && res1Match[1] && res2Match[1]) {
                return `${res1Match[1]}-${res2Match[1]}`;
              }
              return undefined;
            })(),
            result: determineMatchResult(rencontre, isHome),
            // Extraire les informations détaillées du lien
            rencontreId: extractRencontreId(rencontre.lien),
            equipeIds: extractEquipeIds(rencontre.lien),
            lienDetails: rencontre.lien,
            // Ajouter les détails de la rencontre si disponibles
            resultatsIndividuels: detailsRencontre,
            createdAt: new Date(),
            updatedAt: new Date(),
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

function determineMatchResult(
  rencontre: { scoreEquipeA: number | null; scoreEquipeB: number | null },
  isHome: boolean
): string {
  // Vérifier si les scores sont disponibles (scores numériques)
  if (rencontre.scoreEquipeA === null || rencontre.scoreEquipeB === null) {
    return "À VENIR";
  }

  // Les scores sont des nombres, pas des strings
  const scoreA = rencontre.scoreEquipeA;
  const scoreB = rencontre.scoreEquipeB;

  if (typeof scoreA !== "number" || typeof scoreB !== "number") {
    return "À VENIR";
  }

  if (isHome) {
    return scoreA > scoreB ? "VICTOIRE" : scoreA < scoreB ? "DEFAITE" : "NUL";
  } else {
    return scoreB > scoreA ? "VICTOIRE" : scoreB < scoreA ? "DEFAITE" : "NUL";
  }
}

function extractRencontreId(lien: string): string | undefined {
  const match = lien.match(/renc_id=([^&]+)/);
  return match ? match[1] : undefined;
}

function extractEquipeIds(
  lien: string
): { equipe1: string; equipe2: string } | undefined {
  const match1 = lien.match(/equip_id1=([^&]+)/);
  const match2 = lien.match(/equip_id2=([^&]+)/);

  if (match1 && match2) {
    return {
      equipe1: match1[1],
      equipe2: match2[1],
    };
  }
  return undefined;
}
