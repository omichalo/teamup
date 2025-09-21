import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { PlayerSyncService } from "../shared/player-sync";
import { MatchSyncService } from "../shared/match-sync";
import { TeamSyncService } from "../shared/team-sync";

// Initialiser Firebase Admin
admin.initializeApp();

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
 * 🏆 Synchronisation quotidienne des équipes SQY Ping
 * Se déclenche tous les jours à 1h00 (Europe/Paris)
 */
export const syncTeamsDaily = functions.pubsub
  .schedule("0 1 * * *")
  .timeZone("Europe/Paris")
  .onRun(async () => {
    console.log("🏆 Synchronisation quotidienne des équipes SQY Ping démarrée");
    return await syncTeamsFunction();
  });

/**
 * 🏆 Synchronisation manuelle des équipes SQY Ping
 * Déclenchée via HTTP POST
 */
export const syncTeamsManual = functions.https.onRequest(async (req, res) => {
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
    console.log("🏆 Synchronisation manuelle des équipes SQY Ping démarrée");
    const result = await syncTeamsFunction();
    res.status(200).json(result);
  } catch (error) {
    console.error("❌ Erreur synchronisation manuelle des équipes:", error);
    res.status(500).json({
      error: "Erreur lors de la synchronisation",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * 🏆 Synchronisation quotidienne des matchs SQY Ping
 * Se déclenche tous les jours à 2h00 (Europe/Paris)
 */
export const syncMatches = functions.pubsub
  .schedule("0 2 * * *")
  .timeZone("Europe/Paris")
  .onRun(async () => {
    console.log("🚀 Début de la synchronisation des matchs FFTT");
    return await syncMatchesFunction();
  });

/**
 * 🏆 Synchronisation manuelle des matchs SQY Ping
 * Déclenchée via HTTP POST
 */
export const triggerMatchSync = functions.https.onRequest(async (req, res) => {
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
    console.log("🚀 Déclenchement manuel de la synchronisation des matchs");
    const result = await syncMatchesFunction();
    res.status(200).json(result);
  } catch (error) {
    console.error("❌ Erreur synchronisation manuelle des matchs:", error);
    res.status(500).json({
      error: "Erreur lors de la synchronisation",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * 📊 Récupération du statut de synchronisation
 * Cloud Function HTTP pour récupérer les métadonnées
 */
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
        message: "Cette API nécessite une authentification valide",
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
        players: metadata?.players?.toDate?.()?.toISOString() || null,
        matches: metadata?.matches?.toDate?.()?.toISOString() || null,
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

/**
 * 🧹 Nettoyage des doublons de joueurs
 * Cloud Function HTTP pour nettoyer les données
 */
export const cleanupDuplicatePlayers = functions.https.onRequest(
  async (req, res) => {
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
      console.log("🧹 Nettoyage des doublons de joueurs...");

      const db = admin.firestore();

      // Récupérer tous les joueurs
      const playersSnapshot = await db.collection("players").get();
      console.log(
        `📊 ${playersSnapshot.size} documents trouvés dans la collection players`
      );

      const playersByLicence = new Map();
      const duplicatesToDelete: string[] = [];

      // Analyser les documents
      playersSnapshot.forEach((doc) => {
        const data = doc.data();
        const licence = data.licence;

        if (!licence) {
          console.log(`⚠️ Document ${doc.id} sans licence, à supprimer`);
          duplicatesToDelete.push(doc.id);
          return;
        }

        // Si l'ID du document est le numéro de licence, c'est correct
        if (doc.id === licence) {
          if (playersByLicence.has(licence)) {
            console.log(
              `⚠️ Doublon trouvé pour licence ${licence}, document ${doc.id} à supprimer`
            );
            duplicatesToDelete.push(doc.id);
          } else {
            playersByLicence.set(licence, doc);
          }
        } else {
          // Si l'ID n'est pas la licence, c'est probablement un doublon
          if (playersByLicence.has(licence)) {
            console.log(
              `⚠️ Doublon trouvé pour licence ${licence}, document ${doc.id} à supprimer`
            );
            duplicatesToDelete.push(doc.id);
          } else {
            // Garder ce document mais le renommer avec la licence comme ID
            playersByLicence.set(licence, doc);
            duplicatesToDelete.push(doc.id);
          }
        }
      });

      console.log(`🗑️ ${duplicatesToDelete.length} documents à supprimer`);

      // Supprimer les doublons par batch
      let deletedCount = 0;
      const batchSize = 500;

      for (let i = 0; i < duplicatesToDelete.length; i += batchSize) {
        const batch = db.batch();
        const batchEnd = Math.min(i + batchSize, duplicatesToDelete.length);

        for (let j = i; j < batchEnd; j++) {
          const docId = duplicatesToDelete[j];
          const docRef = db.collection("players").doc(docId);
          batch.delete(docRef);
          deletedCount++;
        }

        await batch.commit();
        console.log(`✅ ${deletedCount} documents supprimés`);
      }

      console.log(`✅ Nettoyage terminé: ${deletedCount} doublons supprimés`);

      res.status(200).json({
        success: true,
        message: "Nettoyage des doublons terminé",
        deletedCount,
        remainingCount: playersByLicence.size,
      });
    } catch (error) {
      console.error("❌ Erreur lors du nettoyage:", error);
      res.status(500).json({
        success: false,
        error: "Erreur lors du nettoyage des doublons",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// ===== FONCTIONS UTILITAIRES =====

/**
 * Fonction principale de synchronisation des équipes
 */
async function syncTeamsFunction() {
  try {
    const teamSyncService = new TeamSyncService();
    const db = admin.firestore();

    // Synchroniser les équipes depuis l'API FFTT
    const syncResult = await teamSyncService.syncTeamsAndMatches();

    if (!syncResult.success || !syncResult.processedTeams) {
      return syncResult;
    }

    // Sauvegarder dans Firestore
    const saveResult = await teamSyncService.saveTeamsAndMatchesToFirestore(
      syncResult.processedTeams,
      db
    );

    return {
      success: true,
      teamsCount: saveResult.saved,
      message: `Synchronisation réussie: ${saveResult.saved} équipes sauvegardées`,
    };
  } catch (error) {
    console.error("❌ Erreur lors de la synchronisation des équipes:", error);
    return {
      success: false,
      teamsCount: 0,
      message: "Erreur lors de la synchronisation",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Fonction principale de synchronisation des joueurs
 */
async function syncPlayers() {
  try {
    const playerSyncService = new PlayerSyncService();
    const db = admin.firestore();

    // Synchroniser les joueurs depuis l'API FFTT
    const syncResult = await playerSyncService.syncPlayers();

    if (!syncResult.success || !syncResult.processedPlayers) {
      return syncResult;
    }

    // Sauvegarder dans Firestore
    const saveResult = await playerSyncService.savePlayersToFirestore(
      syncResult.processedPlayers,
      db
    );

    return {
      success: true,
      playersCount: saveResult.saved,
      message: `Synchronisation réussie: ${saveResult.saved} joueurs sauvegardés`,
    };
  } catch (error) {
    console.error("❌ Erreur lors de la synchronisation des joueurs:", error);
    return {
      success: false,
      playersCount: 0,
      message: "Erreur lors de la synchronisation",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Fonction principale de synchronisation des matchs
 */
async function syncMatchesFunction() {
  try {
    const matchSyncService = new MatchSyncService();
    const db = admin.firestore();

    // Synchroniser les matchs depuis l'API FFTT
    const syncResult = await matchSyncService.syncMatches();

    if (!syncResult.success || !syncResult.matches) {
      return syncResult;
    }

    // Sauvegarder dans Firestore
    const saveResult = await matchSyncService.saveMatchesToFirestore(
      syncResult.matches,
      db
    );

    return {
      success: true,
      matchesCount: saveResult.saved,
      message: `Synchronisation réussie: ${saveResult.saved} matchs sauvegardés`,
    };
  } catch (error) {
    console.error("❌ Erreur lors de la synchronisation des matchs:", error);
    return {
      success: false,
      matchesCount: 0,
      message: "Erreur lors de la synchronisation",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
