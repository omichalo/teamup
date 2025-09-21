import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { FFTTAPI } from "@omichalo/ffttapi-node";

// Initialiser Firebase Admin
admin.initializeApp();

// Configuration FFTT depuis les variables d'environnement
const FFTT_ID = functions.config().fftt?.id || "SW251";
const FFTT_PWD = functions.config().fftt?.pwd || "XpZ31v56Jr";
const CLUB_CODE = functions.config().fftt?.club_code || "08781477";

// Interface pour les matchs (copiée depuis le projet principal)
interface Match {
  id: string;
  ffttId: string;
  teamNumber: number;
  opponent: string;
  opponentClub: string;
  date: Date;
  location: string;
  isHome: boolean;
  isExempt: boolean;
  isForfeit: boolean;
  phase: string;
  journee: number;
  isFemale?: boolean;
  division?: string;
  teamId?: string;
  epreuve?: string;
  score?: string;
  result?: string;
  rencontreId?: string;
  equipeIds?: { equipe1: string; equipe2: string };
  lienDetails?: string;
  resultatsIndividuels?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface FFTTEquipe {
  libelle: string;
  division: string;
  lienDivision: string;
  idEquipe: number;
  idEpreuve: number;
  libelleEpreuve: string;
}

interface FFTTJoueur {
  licence: string;
  nom: string;
  prenom: string;
  points: number | null | undefined;
  sexe?: string;
  club?: string;
}

interface FFTTRencontre {
  nomEquipeA: string;
  nomEquipeB: string;
  scoreEquipeA: number | null;
  scoreEquipeB: number | null;
  lien: string;
  libelle?: string;
  dateReelle?: Date;
  datePrevue?: Date;
}

/**
 * 🔄 Synchronisation quotidienne des joueurs SQY Ping
 * Se déclenche tous les jours à 6h00 (Europe/Paris)
 */
export const syncPlayersDaily = functions.pubsub
  .schedule("0 6 * * *")
  .timeZone("Europe/Paris")
  .onRun(async () => {
    console.log("🔄 Synchronisation quotidienne des joueurs SQY Ping démarrée");
    return await syncPlayers();
  });

/**
 * 🔄 Synchronisation manuelle des joueurs SQY Ping
 * Déclenchée via HTTP POST
 */
export const syncPlayersManual = functions.https.onRequest(async (req, res) => {
  // Vérifier que c'est une requête POST
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    console.log("🔄 Synchronisation manuelle des joueurs SQY Ping démarrée");
    const result = await syncPlayers();
    res.status(200).json(result);
  } catch (error) {
    console.error("❌ Erreur synchronisation manuelle:", error);
    res.status(500).json({
      error: "Erreur lors de la synchronisation",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * 🔄 Fonction principale de synchronisation des joueurs
 */
async function syncPlayers() {
  try {
    const ffttApi = new FFTTAPI(FFTT_ID, FFTT_PWD);
    await ffttApi.initialize();

    console.log(`📋 Synchronisation des joueurs pour le club ${CLUB_CODE}`);

    // Récupérer les joueurs depuis l'API FFTT
    const joueurs = await ffttApi.getJoueursByClub(CLUB_CODE);
    console.log(`📊 ${joueurs.length} joueurs récupérés`);

    // Sauvegarder dans Firestore
    const db = admin.firestore();
    const batch = db.batch();
    let savedCount = 0;

    for (const joueur of joueurs as FFTTJoueur[]) {
      const joueurRef = db.collection("players").doc(joueur.licence);
      batch.set(joueurRef, {
        licence: joueur.licence,
        nom: joueur.nom,
        prenom: joueur.prenom,
        points: joueur.points || 0,
        sexe: joueur.sexe || "M",
        club: joueur.club || "",
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      });
      savedCount++;
    }

    await batch.commit();

    // Mettre à jour le timestamp de dernière synchronisation
    await db.collection("metadata").doc("lastSync").set(
      {
        players: admin.firestore.Timestamp.now(),
        playersCount: savedCount,
      },
      { merge: true }
    );

    console.log(`✅ ${savedCount} joueurs synchronisés avec succès`);

    return {
      success: true,
      message: "Synchronisation des joueurs terminée",
      count: savedCount,
    };
  } catch (error) {
    console.error("❌ Erreur lors de la synchronisation des joueurs:", error);
    throw error;
  }
}

// Fonction pour synchroniser les matchs
export const syncMatches = functions.pubsub
  .schedule("0 2 * * *") // Tous les jours à 2h du matin
  .timeZone("Europe/Paris")
  .onRun(async () => {
    console.log("🚀 Début de la synchronisation des matchs FFTT");

    try {
      const ffttApi = new FFTTAPI(FFTT_ID, FFTT_PWD);
      await ffttApi.initialize();

      // Récupérer les équipes du club
      const equipes = await ffttApi.getEquipesByClub(CLUB_CODE);
      console.log(`📋 ${equipes.length} équipes trouvées`);

      // Filtrer les équipes (épreuves 15954 et 15955)
      const equipesFiltered = equipes.filter(
        (equipe: FFTTEquipe) =>
          equipe.idEpreuve === 15954 || equipe.idEpreuve === 15955
      );

      console.log(`🎯 ${equipesFiltered.length} équipes filtrées`);

      const allMatches: Match[] = [];
      const matchesToProcess: Array<{
        equipe: FFTTEquipe;
        rencontre: FFTTRencontre;
        index: number;
        teamNumber: number;
        phase: string;
      }> = [];

      // Paralléliser la récupération des matchs
      const equipesWithMatches = await Promise.all(
        equipesFiltered.map(async (equipe) => {
          try {
            const rencontres = await ffttApi.getRencontrePouleByLienDivision(
              equipe.lienDivision
            );
            return { equipe, rencontres: rencontres as FFTTRencontre[] };
          } catch (error) {
            console.error(`Erreur pour l'équipe ${equipe.libelle}:`, error);
            return { equipe, rencontres: [] };
          }
        })
      );

      // Traiter les matchs
      for (const { equipe, rencontres } of equipesWithMatches) {
        for (let index = 0; index < rencontres.length; index++) {
          const rencontre = rencontres[index];
          const teamNumber = extractTeamNumber(equipe.libelle);
          const phase = determinePhaseFromDivision(equipe.division);

          const hasScore = (() => {
            if (rencontre.scoreEquipeA && rencontre.scoreEquipeB) {
              return true;
            }
            const res1Match = rencontre.lien.match(/res_1=([^&]+)/);
            const res2Match = rencontre.lien.match(/res_2=([^&]+)/);
            return res1Match && res2Match && res1Match[1] && res2Match[1];
          })();

          const match = createBaseMatch(equipe, rencontre, teamNumber, phase);
          if (match) {
            allMatches.push(match);

            if (hasScore) {
              matchesToProcess.push({
                equipe,
                rencontre,
                index: allMatches.length - 1,
                teamNumber,
                phase,
              });
            }
          }
        }
      }

      // Traiter les détails des matchs terminés par batch
      if (matchesToProcess.length > 0) {
        console.log(
          `🔥 ${matchesToProcess.length} matchs avec scores à traiter`
        );

        const BATCH_SIZE = 3;
        const BATCH_DELAY = 1000;

        for (let i = 0; i < matchesToProcess.length; i += BATCH_SIZE) {
          const batch = matchesToProcess.slice(i, i + BATCH_SIZE);

          const batchResults = await Promise.all(
            batch.map(async ({ equipe, rencontre, index }) => {
              try {
                const equipeIds = extractEquipeIds(rencontre.lien);
                if (!equipeIds) return { index, detailsRencontre: null };

                const clubnum1Match = rencontre.lien.match(/clubnum_1=([^&]+)/);
                const clubnum2Match = rencontre.lien.match(/clubnum_2=([^&]+)/);

                let clubEquipeA, clubEquipeB;
                if (clubnum1Match && clubnum2Match) {
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
                    clubEquipeA = equipeIds.equipe1;
                    clubEquipeB = equipeIds.equipe2;
                  }
                } else {
                  clubEquipeA = equipeIds.equipe1;
                  clubEquipeB = equipeIds.equipe2;
                }

                const detailsRencontre =
                  await ffttApi.getDetailsRencontreByLien(
                    rencontre.lien,
                    clubEquipeA,
                    clubEquipeB
                  );

                // Enrichir les données des joueurs
                const enrichedDetails = await enrichPlayerData(
                  detailsRencontre,
                  CLUB_CODE
                );

                return { index, detailsRencontre: enrichedDetails };
              } catch (error) {
                console.error(`Erreur pour ${equipe.libelle}:`, error);
                return { index, detailsRencontre: null };
              }
            })
          );

          // Mettre à jour les matchs avec les détails
          batchResults.forEach(({ index, detailsRencontre }) => {
            if (detailsRencontre && allMatches[index]) {
              allMatches[index].resultatsIndividuels = detailsRencontre;
            }
          });

          // Délai entre les batches
          if (i + BATCH_SIZE < matchesToProcess.length) {
            await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
          }
        }
      }

      // Sauvegarder dans Firestore
      const db = admin.firestore();
      const batch = db.batch();

      for (const match of allMatches) {
        const matchRef = db.collection("matches").doc(match.id);

        // Convertir les objets avec prototypes en objets plain JavaScript
        const matchData = {
          ...match,
          date: admin.firestore.Timestamp.fromDate(match.date),
          createdAt: admin.firestore.Timestamp.fromDate(match.createdAt),
          updatedAt: admin.firestore.Timestamp.fromDate(match.updatedAt),
        };

        // Convertir resultatsIndividuels en objet plain si présent
        if (matchData.resultatsIndividuels) {
          matchData.resultatsIndividuels = JSON.parse(
            JSON.stringify(matchData.resultatsIndividuels)
          );
        }

        // Supprimer les valeurs undefined pour Firestore
        const cleanMatchData = Object.fromEntries(
          Object.entries(matchData).filter(([_, value]) => value !== undefined)
        );

        batch.set(matchRef, cleanMatchData);
      }

      await batch.commit();

      console.log(`✅ ${allMatches.length} matchs synchronisés avec succès`);

      // Mettre à jour le timestamp de dernière synchronisation
      await db.collection("metadata").doc("lastSync").set({
        matches: admin.firestore.Timestamp.now(),
        count: allMatches.length,
      });
    } catch (error) {
      console.error("❌ Erreur lors de la synchronisation:", error);
      throw error;
    }
  });

// Fonction pour déclencher manuellement la synchronisation des matchs
export const triggerMatchSync = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    console.log("🔄 Synchronisation manuelle déclenchée");

    // Appeler la fonction de synchronisation
    await syncMatches.run({} as any, {} as any);

    res.status(200).json({
      success: true,
      message: "Synchronisation des matchs terminée",
    });
  } catch (error) {
    console.error("❌ Erreur lors de la synchronisation manuelle:", error);
    res.status(500).json({
      error: "Erreur lors de la synchronisation",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Fonctions utilitaires (copiées depuis le projet principal)
function extractTeamNumber(teamName: string): number {
  const match = teamName.match(/SQY PING\s*(\d+)/i);
  return match ? parseInt(match[1]) : 1;
}

function isFemaleTeam(division: string): boolean {
  return division.includes("Dames") || division.includes("Féminin");
}

function extractClubName(opponent: string): string {
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
  if (rencontre.scoreEquipeA === null || rencontre.scoreEquipeB === null) {
    return "À VENIR";
  }

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

async function enrichPlayerData(
  detailsRencontre: Record<string, any>,
  clubCode: string
): Promise<Record<string, any>> {
  try {
    const ffttApi = new FFTTAPI(FFTT_ID, FFTT_PWD);
    await ffttApi.initialize();

    const joueursClub = await ffttApi.getJoueursByClub(clubCode);
    const joueursMap = new Map<string, FFTTJoueur>();

    joueursClub.forEach((joueur: any) => {
      const key = `${joueur.nom}_${joueur.prenom}`.toUpperCase();
      joueursMap.set(key, joueur as FFTTJoueur);
    });

    // Enrichir les joueurs de l'équipe A
    if (detailsRencontre.joueursA) {
      Object.keys(detailsRencontre.joueursA).forEach((playerKey) => {
        const player = detailsRencontre.joueursA[playerKey];
        const searchKey = `${player.nom}_${player.prenom}`.toUpperCase();
        const clubPlayer = joueursMap.get(searchKey);

        if (clubPlayer && (!player.licence || !player.points)) {
          player.licence = clubPlayer.licence || player.licence;
          player.points = clubPlayer.points || player.points;
          player.sexe = clubPlayer.sexe || player.sexe;
        }
      });
    }

    // Enrichir les joueurs de l'équipe B
    if (detailsRencontre.joueursB) {
      Object.keys(detailsRencontre.joueursB).forEach((playerKey) => {
        const player = detailsRencontre.joueursB[playerKey];
        const searchKey = `${player.nom}_${player.prenom}`.toUpperCase();
        const clubPlayer = joueursMap.get(searchKey);

        if (clubPlayer && (!player.licence || !player.points)) {
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
    return detailsRencontre;
  }
}

function createBaseMatch(
  equipe: FFTTEquipe,
  rencontre: FFTTRencontre,
  teamNumber: number,
  phase: string
): Match | null {
  const equip1 = rencontre.nomEquipeA || "";
  const equip2 = rencontre.nomEquipeB || "";

  const sqyPingInMatch =
    equip1.includes("SQY PING") || equip2.includes("SQY PING");
  if (!sqyPingInMatch) {
    return null;
  }

  const isHome = equip1.includes("SQY PING");
  const opponent = isHome ? equip2 : equip1;
  const opponentClub = extractClubName(opponent);

  let journee = 1;
  const tourMatch = rencontre.libelle?.match(/tour n°(\d+)/);
  if (tourMatch) {
    journee = parseInt(tourMatch[1]);
  }

  let matchDate: Date;
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
    const currentYear = new Date().getFullYear();
    const seasonStart = new Date(currentYear, 8, 1);
    const journeeOffset = (journee - 1) * 7;
    matchDate = new Date(
      seasonStart.getTime() + journeeOffset * 24 * 60 * 60 * 1000
    );
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
    isExempt: false,
    isForfeit: false,
    phase: phase,
    journee: journee,
    isFemale: isFemaleTeam(equipe.division),
    division: equipe.division,
    teamId: `${teamNumber}_${isFemaleTeam(equipe.division) ? "F" : "M"}`,
    epreuve: equipe.libelleEpreuve,
    score: (() => {
      if (rencontre.scoreEquipeA && rencontre.scoreEquipeB) {
        return `${rencontre.scoreEquipeA}-${rencontre.scoreEquipeB}`;
      }
      const res1Match = rencontre.lien.match(/res_1=([^&]+)/);
      const res2Match = rencontre.lien.match(/res_2=([^&]+)/);
      if (res1Match && res2Match && res1Match[1] && res2Match[1]) {
        return `${res1Match[1]}-${res2Match[1]}`;
      }
      return undefined;
    })(),
    result: determineMatchResult(rencontre, isHome),
    rencontreId: extractRencontreId(rencontre.lien),
    equipeIds: extractEquipeIds(rencontre.lien),
    lienDetails: rencontre.lien,
    resultatsIndividuels: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Cloud Function pour récupérer le statut de synchronisation
export const getSyncStatus = functions.https.onRequest(async (req, res) => {
  // Configurer CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    // Vérifier l'authentification
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ 
        error: "Token d'authentification requis",
        message: "Cette API nécessite une authentification valide"
      });
      return;
    }

    const token = authHeader.split(" ")[1];
    
    // Vérifier le token Firebase
    const decodedToken = await admin.auth().verifyIdToken(token);
    console.log("✅ Utilisateur authentifié:", decodedToken.email);

    console.log("🔄 Récupération du statut de synchronisation...");

    // Initialiser Firestore
    const db = admin.firestore();

    // Récupérer les métadonnées de synchronisation
    const metadataDoc = await db.collection("metadata").doc("lastSync").get();
    const metadata = metadataDoc.exists ? metadataDoc.data() : {};

    // Récupérer le nombre de joueurs
    const playersSnapshot = await db.collection("players").get();
    const playersCount = playersSnapshot.size;

    // Récupérer le nombre de matchs
    const matchesSnapshot = await db.collection("matches").get();
    const matchesCount = matchesSnapshot.size;

    console.log(
      `✅ Statut récupéré: ${playersCount} joueurs, ${matchesCount} matchs`
    );

    res.status(200).json({
      success: true,
      playersCount,
      matchesCount,
      lastSync: {
        players: metadata.players?.toDate?.()?.toISOString() || null,
        matches: metadata.matches?.toDate?.()?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération du statut:", error);
    
    // Si c'est une erreur d'authentification
    if (error instanceof Error && error.message.includes("auth")) {
      res.status(401).json({
        success: false,
        error: "Token d'authentification invalide",
        details: error.message,
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      error: "Erreur lors de la récupération du statut de synchronisation",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
