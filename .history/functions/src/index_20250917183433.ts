import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { FFTTAPI } from "@omichalo/ffttapi-node";

// Initialiser Firebase Admin
admin.initializeApp();

// Configuration FFTT
const ffttApi = new FFTTAPI("SW251", "XpZ31v56Jr");

// Interface pour les joueurs FFTT (basée sur l'API réelle)
// interface FFTTPlayer {
//   licence: string;
//   nom: string;
//   prenom: string;
//   points: number;
//   classement?: number;
//   natio?: string;
//   sexe?: string;
// }

// Interface pour les joueurs dans Firestore
interface Player {
  ffttId: string;
  firstName: string;
  lastName: string;
  points: number;
  ranking: number;
  isForeign: boolean;
  isTransferred: boolean;
  isFemale: boolean;
  teamNumber: number;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

/**
 * 🔄 Synchronisation quotidienne des joueurs SQY Ping
 * Se déclenche tous les jours à 6h00 (Europe/Paris)
 */
export const syncPlayersDaily = functions.pubsub
  .schedule("0 6 * * *")
  .timeZone("Europe/Paris")
  .onRun(async (context) => {
    console.log("🔄 Synchronisation quotidienne des joueurs SQY Ping démarrée");
    return await syncPlayers();
  });

/**
 * 🔄 Synchronisation hebdomadaire des joueurs SQY Ping
 * Se déclenche tous les dimanches à 8h00 (Europe/Paris)
 */
export const syncPlayersWeekly = functions.pubsub
  .schedule("0 8 * * 0")
  .timeZone("Europe/Paris")
  .onRun(async (context) => {
    console.log(
      "🔄 Synchronisation hebdomadaire des joueurs SQY Ping démarrée"
    );
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
  const db = admin.firestore();
  const startTime = Date.now();

  try {
    console.log("📡 Initialisation de l'API FFTT...");
    await ffttApi.initialize();

    console.log("📊 Récupération des joueurs SQY Ping...");
    const players = await ffttApi.getJoueursByClub("08781477");
    console.log(`${players.length} joueurs récupérés depuis l'API FFTT`);

    if (players.length === 0) {
      return {
        message: "Aucun joueur trouvé",
        synced: 0,
        total: 0,
        duration: Date.now() - startTime,
      };
    }

    // Statistiques de synchronisation
    let syncedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];

    // Traitement par batch pour optimiser les performances
    const batchSize = 10;
    const batches = [];

    for (let i = 0; i < players.length; i += batchSize) {
      batches.push(players.slice(i, i + batchSize));
    }

    console.log(
      `📦 Traitement en ${batches.length} batches de ${batchSize} joueurs`
    );

    for (const batch of batches) {
      const batchPromises = batch.map(async (ffttPlayer: any) => {
        try {
          // Vérifier si le joueur existe déjà
          const existingPlayers = await db
            .collection("players")
            .where("ffttId", "==", ffttPlayer.licence)
            .get();

          const playerData: Omit<Player, "createdAt"> = {
            ffttId: ffttPlayer.licence,
            firstName: ffttPlayer.prenom || "",
            lastName: ffttPlayer.nom || "",
            points: ffttPlayer.points || 0,
            ranking: ffttPlayer.classement || 0,
            isForeign: ffttPlayer.natio === "E",
            isTransferred: false, // À déterminer selon les règles FFTT
            isFemale: ffttPlayer.sexe === "F",
            teamNumber: 0, // À assigner manuellement
            updatedAt: new Date(),
          };

          if (existingPlayers.empty) {
            // Créer un nouveau joueur
            await db.collection("players").add({
              ...playerData,
              createdAt: new Date(),
            });
            createdCount++;
            console.log(
              `✅ Joueur créé: ${playerData.firstName} ${playerData.lastName} (${playerData.ffttId})`
            );
          } else {
            // Mettre à jour le joueur existant
            const existingPlayer = existingPlayers.docs[0];
            await existingPlayer.ref.update(playerData);
            updatedCount++;
            console.log(
              `🔄 Joueur mis à jour: ${playerData.firstName} ${playerData.lastName} (${playerData.ffttId})`
            );
          }

          syncedCount++;
        } catch (error) {
          const errorMsg = `Erreur pour ${ffttPlayer.nom} ${ffttPlayer.prenom}: ${error}`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
        }
      });

      // Attendre que tous les joueurs du batch soient traités
      await Promise.all(batchPromises);
    }

    const duration = Date.now() - startTime;
    const result = {
      message: "Synchronisation des joueurs terminée",
      synced: syncedCount,
      total: players.length,
      created: createdCount,
      updated: updatedCount,
      errors: errors.length,
      duration: duration,
      timestamp: new Date(),
    };

    console.log("📊 Résumé de la synchronisation:");
    console.log(`   Total joueurs: ${players.length}`);
    console.log(`   Synchronisés: ${syncedCount}`);
    console.log(`   Créés: ${createdCount}`);
    console.log(`   Mis à jour: ${updatedCount}`);
    console.log(`   Erreurs: ${errors.length}`);
    console.log(`   Durée: ${duration}ms`);

    // Enregistrer le résultat dans Firestore pour le suivi
    await db.collection("sync_logs").add({
      type: "players_sync",
      ...result,
      errors: errors.length > 0 ? errors : undefined,
    });

    return result;
  } catch (error) {
    console.error("❌ Erreur générale synchronisation:", error);

    // Enregistrer l'erreur dans Firestore
    await db.collection("sync_logs").add({
      type: "players_sync_error",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date(),
    });

    throw error;
  }
}

/**
 * 📊 Fonction pour récupérer les logs de synchronisation
 */
export const getSyncLogs = functions.https.onRequest(async (req, res) => {
  try {
    const db = admin.firestore();
    const limit = parseInt(req.query.limit as string) || 10;

    const logs = await db
      .collection("sync_logs")
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get();

    const logsData = logs.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({
      logs: logsData,
      count: logsData.length,
    });
  } catch (error) {
    console.error("❌ Erreur récupération logs:", error);
    res.status(500).json({
      error: "Erreur lors de la récupération des logs",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * 🧪 Fonction de test pour vérifier la connectivité FFTT
 */
export const testFFTTConnection = functions.https.onRequest(
  async (req, res) => {
    try {
      console.log("🧪 Test de connexion FFTT...");

      await ffttApi.initialize();
      const clubDetails = await ffttApi.getClubDetails("08781477");

      res.status(200).json({
        message: "Connexion FFTT réussie",
        club: {
          nom: clubDetails.nom,
          numero: clubDetails.numero,
          nomSalle: clubDetails.nomSalle,
          villeSalle: clubDetails.villeSalle,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("❌ Erreur test FFTT:", error);
      res.status(500).json({
        error: "Erreur de connexion FFTT",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);
