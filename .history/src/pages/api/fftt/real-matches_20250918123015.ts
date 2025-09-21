import { NextApiRequest, NextApiResponse } from "next";
import { FFTTAPI } from "@omichalo/ffttapi-node";
import { Match } from "@/types";

interface FFTTEquipe {
  libelle: string;
  division: string;
  idEquipe: string;
  libelleEpreuve: string;
  lienDivision: string;
}

interface FFTTRencontre {
  nomEquipeA: string;
  nomEquipeB: string;
  scoreEquipeA: number | null;
  scoreEquipeB: number | null;
  lien: string;
  libelle: string;
  dateReelle: Date | null;
  datePrevue: Date | null;
}

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
    const matchesToProcess: Array<{
      equipe: FFTTEquipe;
      rencontre: FFTTRencontre;
      index: number;
      teamNumber: number;
      phase: string;
    }> = [];

    // Filtrer uniquement les épreuves qui nous intéressent (15954 et 15955)
    const equipesFiltered = equipes.filter(
      (equipe) => equipe.idEpreuve === 15954 || equipe.idEpreuve === 15955
    );
    console.log(
      `Équipes filtrées (épreuves 15954 et 15955): ${equipesFiltered.length}`
    );

    // 🚀 ÉTAPE 1: Paralléliser la récupération des matchs pour toutes les équipes
    console.log(
      `🚀 Parallélisation de ${equipesFiltered.length} appels API...`
    );
    const equipesWithMatches = await Promise.all(
      equipesFiltered.map(async (equipe) => {
        try {
          console.log(
            `Récupération des matchs pour l'équipe: ${equipe.libelle}`
          );

          // Récupérer les matchs de la poule
          const rencontres = await ffttApi.getRencontrePouleByLienDivision(
            equipe.lienDivision
          );
          console.log(
            `Matchs trouvés pour ${equipe.libelle}:`,
            rencontres.length
          );

          return { equipe, rencontres };
        } catch (error) {
          console.error(`Erreur pour l'équipe ${equipe.libelle}:`, error);
          return { equipe, rencontres: [] };
        }
      })
    );
    console.log(`✅ Tous les appels API terminés !`);

    // 🚀 ÉTAPE 2: Collecter tous les matchs et identifier ceux avec scores
    for (const { equipe, rencontres } of equipesWithMatches) {
      try {
        // Transformer les rencontres en objets Match
        for (let index = 0; index < rencontres.length; index++) {
          const rencontre = rencontres[index];
          const teamNumber = extractTeamNumber(equipe.libelle);
          const phase = determinePhaseFromDivision(equipe.division);

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

          // Créer le match de base (sans détails pour l'instant)
          const match = createBaseMatch(equipe, rencontre, teamNumber, phase);
          if (match) {
            allMatches.push(match);

            // Si le match a un score, l'ajouter à la liste des matchs à traiter
            if (hasScore) {
              matchesWithScores++;
              console.log(
                `🔥🔥🔥 MATCH AVEC SCORE DÉTECTÉ pour ${equipe.libelle} 🔥🔥🔥`
              );

              // Utiliser l'index réel dans allMatches (length - 1 car on vient d'ajouter)
              matchesToProcess.push({
                equipe,
                rencontre,
                index: allMatches.length - 1, // Index réel dans allMatches
                teamNumber,
                phase,
              });
            }
          }
        }
      } catch (equipeError) {
        console.error(`Erreur pour l'équipe ${equipe.libelle}:`, equipeError);
        // Continuer avec les autres équipes
      }
    }

    // 🚀 ÉTAPE 3: Traiter les détails par batch pour éviter la surcharge API
    if (matchesToProcess.length > 0) {
      console.log(
        `🚀 Traitement par batch de ${matchesToProcess.length} appels de détails...`
      );

      const BATCH_SIZE = 3; // Maximum 3 appels simultanés
      const BATCH_DELAY = 1000; // 1 seconde entre les batches
      const detailsResults: Array<{ index: number; detailsRencontre: any }> =
        [];

      // Traiter par batches
      for (let i = 0; i < matchesToProcess.length; i += BATCH_SIZE) {
        const batch = matchesToProcess.slice(i, i + BATCH_SIZE);
        console.log(
          `📦 Traitement du batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
            matchesToProcess.length / BATCH_SIZE
          )} (${batch.length} appels)`
        );

        const batchResults = await Promise.all(
          batch.map(async ({ equipe, rencontre, index }) => {
            try {
              const equipeIds = extractEquipeIds(rencontre.lien);
              if (!equipeIds) {
                return { index, detailsRencontre: null };
              }

              console.log(
                `Récupération des détails pour match terminé: ${equipeIds.equipe1} vs ${equipeIds.equipe2}`
              );

              // Essayer de récupérer les vrais détails avec l'API FFTT
              try {
                // Extraire les numéros de club depuis le lien
                const clubnum1Match = rencontre.lien.match(/clubnum_1=([^&]+)/);
                const clubnum2Match = rencontre.lien.match(/clubnum_2=([^&]+)/);

                // Déterminer quel club correspond à quelle équipe
                let clubEquipeA, clubEquipeB;
                if (clubnum1Match && clubnum2Match) {
                  // Vérifier quelle équipe est SQY PING
                  const equip1Match = rencontre.lien.match(/equip_1=([^&]+)/);
                  const equip2Match = rencontre.lien.match(/equip_2=([^&]+)/);

                  if (equip1Match && equip1Match[1].includes("SQY+PING")) {
                    clubEquipeA = clubnum1Match[1];
                    clubEquipeB = clubnum2Match[1];
                  } else if (
                    equip2Match &&
                    equip2Match[1].includes("SQY+PING")
                  ) {
                    clubEquipeA = clubnum2Match[1];
                    clubEquipeB = clubnum1Match[1];
                  } else {
                    // Fallback: utiliser les IDs d'équipe comme clubs
                    clubEquipeA = equipeIds.equipe1;
                    clubEquipeB = equipeIds.equipe2;
                  }
                } else {
                  // Fallback: utiliser les IDs d'équipe comme clubs
                  clubEquipeA = equipeIds.equipe1;
                  clubEquipeB = equipeIds.equipe2;
                }

                // Essayer d'abord avec les numéros de club, puis avec les IDs d'équipe si ça échoue
                let detailsRencontre = null;
                let lastError = null;

                // Tentative 1: avec les numéros de club
                if (clubnum1Match && clubnum2Match) {
                  try {
                    console.log(
                      `Tentative 1 - Appel API avec clubs: ${clubEquipeA} vs ${clubEquipeB}`
                    );
                    detailsRencontre = await ffttApi.getDetailsRencontreByLien(
                      rencontre.lien,
                      clubEquipeA,
                      clubEquipeB
                    );
                    console.log(
                      `✅ Détails récupérés avec succès (clubs) pour ${equipe.libelle}`
                    );
                  } catch (error) {
                    lastError = error;
                    console.log(
                      `❌ Erreur avec les clubs pour ${equipe.libelle}:`,
                      error.message
                    );

                    // Créer un objet de détails basique immédiatement
                    const score = (() => {
                      const res1Match = rencontre.lien.match(/res_1=([^&]+)/);
                      const res2Match = rencontre.lien.match(/res_2=([^&]+)/);
                      if (
                        res1Match &&
                        res2Match &&
                        res1Match[1] &&
                        res2Match[1]
                      ) {
                        return `${res1Match[1]}-${res2Match[1]}`;
                      }
                      return null;
                    })();

                    if (score) {
                      const equip1Match =
                        rencontre.lien.match(/equip_1=([^&]+)/);
                      const equip2Match =
                        rencontre.lien.match(/equip_2=([^&]+)/);
                      const isSQYPingEquip1 =
                        equip1Match && equip1Match[1].includes("SQY+PING");

                      const res1 = parseInt(
                        rencontre.lien.match(/res_1=([^&]+)/)?.[1] || "0"
                      );
                      const res2 = parseInt(
                        rencontre.lien.match(/res_2=([^&]+)/)?.[1] || "0"
                      );

                      let expectedScoreEquipeA, expectedScoreEquipeB;
                      if (isSQYPingEquip1) {
                        expectedScoreEquipeA = res1;
                        expectedScoreEquipeB = res2;
                      } else {
                        expectedScoreEquipeA = res2;
                        expectedScoreEquipeB = res1;
                      }

                      detailsRencontre = {
                        rencontreId: extractRencontreId(rencontre.lien),
                        equipeIds: equipeIds,
                        lien: rencontre.lien,
                        score: score,
                        status: "TERMINÉ",
                        expectedScoreEquipeA: expectedScoreEquipeA,
                        expectedScoreEquipeB: expectedScoreEquipeB,
                        nomEquipeA: equip1Match?.[1] || "Équipe A",
                        nomEquipeB: equip2Match?.[1] || "Équipe B",
                        note: "Détails basiques - API FFTT indisponible",
                        error: error.message,
                        joueursA: [],
                        joueursB: [],
                        parties: [],
                      };
                      console.log(
                        `✅ Détails basiques créés pour ${equipe.libelle}`
                      );
                    }
                  }
                }

                // Tentative 2: avec les IDs d'équipe si la première tentative échoue
                if (!detailsRencontre && equipeIds) {
                  try {
                    console.log(
                      `Tentative 2 - Appel API avec IDs équipe: ${equipeIds.equipe1} vs ${equipeIds.equipe2}`
                    );
                    detailsRencontre = await ffttApi.getDetailsRencontreByLien(
                      rencontre.lien,
                      equipeIds.equipe1,
                      equipeIds.equipe2
                    );
                    console.log(
                      `✅ Détails récupérés avec succès (IDs équipe) pour ${equipe.libelle}`
                    );
                  } catch (error) {
                    lastError = error;
                    console.log(
                      `❌ Erreur avec les IDs équipe pour ${equipe.libelle}:`,
                      error.message
                    );
                  }
                }

                // Si aucune tentative n'a fonctionné, créer un objet de détails basique
                if (!detailsRencontre) {
                  console.log(
                    `❌ Toutes les tentatives ont échoué pour ${equipe.libelle}`
                  );
                  // Créer un objet de détails basique mais avec les bonnes informations
                  const score = (() => {
                    const res1Match = rencontre.lien.match(/res_1=([^&]+)/);
                    const res2Match = rencontre.lien.match(/res_2=([^&]+)/);
                    if (
                      res1Match &&
                      res2Match &&
                      res1Match[1] &&
                      res2Match[1]
                    ) {
                      return `${res1Match[1]}-${res2Match[1]}`;
                    }
                    return null;
                  })();

                  // Déterminer qui a gagné
                  const equip1Match = rencontre.lien.match(/equip_1=([^&]+)/);
                  const equip2Match = rencontre.lien.match(/equip_2=([^&]+)/);
                  const isSQYPingEquip1 =
                    equip1Match && equip1Match[1].includes("SQY+PING");

                  const res1 = parseInt(
                    rencontre.lien.match(/res_1=([^&]+)/)?.[1] || "0"
                  );
                  const res2 = parseInt(
                    rencontre.lien.match(/res_2=([^&]+)/)?.[1] || "0"
                  );

                  let expectedScoreEquipeA, expectedScoreEquipeB;
                  if (isSQYPingEquip1) {
                    expectedScoreEquipeA = res1;
                    expectedScoreEquipeB = res2;
                  } else {
                    expectedScoreEquipeA = res2;
                    expectedScoreEquipeB = res1;
                  }

                  detailsRencontre = {
                    rencontreId: extractRencontreId(rencontre.lien),
                    equipeIds: equipeIds,
                    lien: rencontre.lien,
                    score: score,
                    status: "TERMINÉ",
                    expectedScoreEquipeA: expectedScoreEquipeA,
                    expectedScoreEquipeB: expectedScoreEquipeB,
                    nomEquipeA: equip1Match?.[1] || "Équipe A",
                    nomEquipeB: equip2Match?.[1] || "Équipe B",
                    note: "Détails basiques - API FFTT indisponible",
                    error:
                      lastError instanceof Error
                        ? lastError.message
                        : "Erreur inconnue",
                    // Ajouter des données fictives pour l'affichage
                    joueursA: [],
                    joueursB: [],
                    parties: [],
                  };
                }

                // Enrichir les données des joueurs avec licences et points si manquants
                if (
                  detailsRencontre &&
                  detailsRencontre.joueursA &&
                  detailsRencontre.joueursB
                ) {
                  detailsRencontre = await enrichPlayerData(
                    detailsRencontre,
                    clubCode as string
                  );
                }

                return { index, detailsRencontre };
              } catch (apiError) {
                console.log(`❌ Erreur API pour ${equipe.libelle}:`, apiError);

                // Fallback: créer un objet de détails basique
                const detailsRencontre = {
                  rencontreId: extractRencontreId(rencontre.lien),
                  equipeIds: equipeIds,
                  lien: rencontre.lien,
                  score: (() => {
                    const res1Match = rencontre.lien.match(/res_1=([^&]+)/);
                    const res2Match = rencontre.lien.match(/res_2=([^&]+)/);
                    if (
                      res1Match &&
                      res2Match &&
                      res1Match[1] &&
                      res2Match[1]
                    ) {
                      return `${res1Match[1]}-${res2Match[1]}`;
                    }
                    return null;
                  })(),
                  status: "TERMINÉ",
                  note: "Détails basiques - API FFTT indisponible",
                  error:
                    apiError instanceof Error
                      ? apiError.message
                      : "Erreur inconnue",
                };

                return { index, detailsRencontre };
              }
            } catch (error) {
              console.log(
                `Erreur lors de la création des détails du match terminé:`,
                error
              );
              return { index, detailsRencontre: null };
            }
          })
        );

        // Ajouter les résultats du batch
        detailsResults.push(...batchResults);

        // Délai entre les batches (sauf pour le dernier)
        if (i + BATCH_SIZE < matchesToProcess.length) {
          console.log(
            `⏳ Attente de ${BATCH_DELAY}ms avant le prochain batch...`
          );
          await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
        }
      }

      console.log(`✅ Tous les batches de détails terminés !`);

      // 🚀 ÉTAPE 4: Fusionner les détails avec les matchs
      detailsResults.forEach(({ index, detailsRencontre }) => {
        if (detailsRencontre && allMatches[index]) {
          allMatches[index].resultatsIndividuels = detailsRencontre;
        }
      });
    }

    if (allMatches.length === 0) {
      return res.status(404).json({ error: "No matches found for this club" });
    }

    // Trier par date
    allMatches.sort((a, b) => a.date.getTime() - b.date.getTime());

    console.log(`Total des matchs récupérés: ${allMatches.length}`);
    console.log(
      `🔥🔥🔥 MATCHS AVEC SCORES DÉTECTÉS: ${matchesWithScores} 🔥🔥🔥`
    );
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

// Fonction pour enrichir les données des joueurs avec licences et points
async function enrichPlayerData(
  detailsRencontre: any,
  clubCode: string
): Promise<any> {
  try {
    console.log(
      `🔍 Enrichissement des données joueurs pour le club ${clubCode}`
    );

    // Récupérer tous les joueurs du club
    const joueursClub = await ffttApi.getJoueursByClub(clubCode);
    console.log(
      `📋 ${joueursClub.length} joueurs trouvés pour le club ${clubCode}`
    );

    // Créer un map pour recherche rapide par nom/prénom
    const joueursMap = new Map<string, any>();
    joueursClub.forEach((joueur: any) => {
      const key = `${joueur.nom}_${joueur.prenom}`.toUpperCase();
      joueursMap.set(key, joueur);
    });

    // Enrichir les joueurs de l'équipe A (SQY PING)
    if (detailsRencontre.joueursA) {
      Object.keys(detailsRencontre.joueursA).forEach((playerKey) => {
        const player = detailsRencontre.joueursA[playerKey];
        const searchKey = `${player.nom}_${player.prenom}`.toUpperCase();
        const clubPlayer = joueursMap.get(searchKey);

        if (clubPlayer && (!player.licence || !player.points)) {
          console.log(
            `✅ Enrichissement: ${player.nom} ${player.prenom} -> licence: ${clubPlayer.licence}, points: ${clubPlayer.points}`
          );
          player.licence = clubPlayer.licence || player.licence;
          player.points = clubPlayer.points || player.points;
          player.sexe = clubPlayer.sexe || player.sexe;
        }
      });
    }

    // Enrichir les joueurs de l'équipe B (SQY PING)
    if (detailsRencontre.joueursB) {
      Object.keys(detailsRencontre.joueursB).forEach((playerKey) => {
        const player = detailsRencontre.joueursB[playerKey];
        const searchKey = `${player.nom}_${player.prenom}`.toUpperCase();
        const clubPlayer = joueursMap.get(searchKey);

        if (clubPlayer && (!player.licence || !player.points)) {
          console.log(
            `✅ Enrichissement: ${player.nom} ${player.prenom} -> licence: ${clubPlayer.licence}, points: ${clubPlayer.points}`
          );
          player.licence = clubPlayer.licence || player.licence;
          player.points = clubPlayer.points || player.points;
          player.sexe = clubPlayer.sexe || player.sexe;
        }
      });
    }

    return detailsRencontre;
  } catch (error) {
    console.log(
      `❌ Erreur lors de l'enrichissement des données joueurs:`,
      error
    );
    return detailsRencontre; // Retourner les données originales en cas d'erreur
  }
}

function createBaseMatch(
  equipe: FFTTEquipe,
  rencontre: FFTTRencontre,
  teamNumber: number,
  phase: string
): Match | null {
  // Utiliser les vraies données des équipes de l'API FFTT
  const equip1 = rencontre.nomEquipeA || "";
  const equip2 = rencontre.nomEquipeB || "";

  // FILTRER : Ne garder que les matchs où SQY PING joue
  const sqyPingInMatch =
    equip1.includes("SQY PING") || equip2.includes("SQY PING");
  if (!sqyPingInMatch) {
    return null; // Ignorer les matchs entre autres équipes
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

  return {
    id: `match_${equipe.idEquipe}_${journee}_${rencontre.lien || "unknown"}`,
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
    teamId: `${teamNumber}_${isFemaleTeam(equipe.division) ? "F" : "M"}`,
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
    // Les détails seront ajoutés plus tard
    resultatsIndividuels: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
