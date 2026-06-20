import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialiser Firebase Admin
admin.initializeApp();

// Importer les wrappers de synchronisation
import {
  syncPlayersWrapper,
  syncTeamsWrapper,
  syncTeamMatchesWrapper,
} from "./sync-wrappers";
import { ffttSyncFunctions } from "./sync-runtime";

const ALLOWED_ROLES = new Set(["admin", "secretary", "coach", "player"]);
const ALLOWED_COACH_STATUSES = new Set([
  "none",
  "pending",
  "approved",
  "rejected",
]);

const resolveRole = (role: unknown): "admin" | "secretary" | "coach" | "player" => {
  if (typeof role === "string" && ALLOWED_ROLES.has(role)) {
    return role as "admin" | "secretary" | "coach" | "player";
  }
  return "player";
};

const resolveCoachStatus = (
  status: unknown,
  role: "admin" | "secretary" | "coach" | "player"
): "none" | "pending" | "approved" | "rejected" => {
  if (role === "coach") {
    if (typeof status === "string" && ALLOWED_COACH_STATUSES.has(status)) {
      return status as "none" | "pending" | "approved" | "rejected";
    }
    return "approved";
  }

  return "none";
};

/**
 * 🔄 Synchronisation quotidienne des joueurs SQY Ping
 * Se déclenche tous les jours à 6h00 (Europe/Paris)
 */
export const syncPlayersDaily = ffttSyncFunctions.pubsub
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
export const syncPlayersManual = ffttSyncFunctions.https.onRequest(async (req, res) => {
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
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Token d'authentification requis" });
      return;
    }

    const decodedToken = await admin.auth().verifyIdToken(
      authHeader.split(" ")[1]
    );
    const role = resolveRole(decodedToken.role);
    if (role !== "admin" && role !== "coach") {
      res.status(403).json({ error: "Accès refusé" });
      return;
    }
  } catch (authError) {
    console.error("❌ Auth error:", authError);
    res.status(401).json({ error: "Token d'authentification invalide" });
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
 * Se déclenche tous les jours à 6h05 (Europe/Paris) - 5 minutes après les joueurs
 */
export const syncTeamsDaily = ffttSyncFunctions.pubsub
  .schedule("5 6 * * *")
  .timeZone("Europe/Paris")
  .onRun(async () => {
    console.log("🏆 Synchronisation quotidienne des équipes SQY Ping démarrée");
    return await syncTeamsFunction();
  });

/**
 * 🏆 Synchronisation manuelle des équipes SQY Ping
 * Déclenchée via HTTP POST
 */
export const syncTeamsManual = ffttSyncFunctions.https.onRequest(async (req, res) => {
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
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Token d'authentification requis" });
      return;
    }

    const decodedToken = await admin.auth().verifyIdToken(
      authHeader.split(" ")[1]
    );
    const role = resolveRole(decodedToken.role);
    if (role !== "admin" && role !== "coach") {
      res.status(403).json({ error: "Accès refusé" });
      return;
    }
  } catch (authError) {
    console.error("❌ Auth error:", authError);
    res.status(401).json({ error: "Token d'authentification invalide" });
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
 * 🏆 Synchronisation quotidienne des matchs par équipe SQY Ping
 * Se déclenche tous les jours à 6h10 (Europe/Paris) - 10 minutes après les joueurs
 */
export const syncTeamMatchesDaily = ffttSyncFunctions.pubsub
  .schedule("10 6 * * *")
  .timeZone("Europe/Paris")
  .onRun(async () => {
    console.log(
      "🏆 Synchronisation quotidienne des matchs par équipe SQY Ping démarrée"
    );
    return await syncTeamMatchesFunction();
  });

/**
 * 🏆 Synchronisation manuelle des matchs par équipe SQY Ping
 * Déclenchée via HTTP POST
 */
export const syncTeamMatchesManual = ffttSyncFunctions.https.onRequest(
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
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Token d'authentification requis" });
        return;
      }

      const decodedToken = await admin.auth().verifyIdToken(
        authHeader.split(" ")[1]
      );
      const role = resolveRole(decodedToken.role);
      if (role !== "admin" && role !== "coach") {
        res.status(403).json({ error: "Accès refusé" });
        return;
      }
    } catch (authError) {
      console.error("❌ Auth error:", authError);
      res.status(401).json({ error: "Token d'authentification invalide" });
      return;
    }

    try {
      console.log(
        "🏆 Synchronisation manuelle des matchs par équipe SQY Ping démarrée"
      );
      const result = await syncTeamMatchesFunction();
      res.status(200).json(result);
    } catch (error) {
      console.error(
        "❌ Erreur synchronisation manuelle des matchs par équipe:",
        error
      );
      res.status(500).json({
        error: "Erreur lors de la synchronisation",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

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
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Token d'authentification requis" });
      return;
    }

    const decodedToken = await admin.auth().verifyIdToken(
      authHeader.split(" ")[1]
    );
    const role = resolveRole(decodedToken.role);
    if (role !== "admin" && role !== "coach") {
      res.status(403).json({ error: "Accès refusé" });
      return;
    }
  } catch (authError) {
    console.error("❌ Auth error:", authError);
    res.status(401).json({ error: "Token d'authentification invalide" });
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

export const setUserRole = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
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
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        error: "Token d'authentification requis",
      });
      return;
    }

    const token = authHeader.split(" ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token);

    if (decodedToken.role !== "admin") {
      res.status(403).json({
        success: false,
        error: "Accès refusé",
      });
      return;
    }

    const { userId, role, coachRequestStatus, coachRequestMessage, playerId } =
      req.body ?? {};

    if (typeof userId !== "string" || userId.length === 0) {
      res.status(400).json({
        success: false,
        error: "Paramètre 'userId' invalide",
      });
      return;
    }

    const resolvedRole = resolveRole(role);
    const resolvedCoachStatus = resolveCoachStatus(
      coachRequestStatus,
      resolvedRole
    );

    const userRecord = await admin.auth().getUser(userId);
    const existingClaims = userRecord.customClaims ?? {};

    await admin.auth().setCustomUserClaims(userId, {
      ...existingClaims,
      role: resolvedRole,
      coachRequestStatus: resolvedCoachStatus,
    });

    await admin.auth().revokeRefreshTokens(userId);

    const firestore = admin.firestore();
    const now = admin.firestore.FieldValue.serverTimestamp();

    await firestore.collection("users").doc(userId).set(
      {
        role: resolvedRole,
        coachRequestStatus: resolvedCoachStatus,
        coachRequestMessage:
          coachRequestMessage !== undefined
            ? coachRequestMessage
            : admin.firestore.FieldValue.delete(),
        coachRequestHandledBy: decodedToken.uid,
        coachRequestHandledAt: now,
        coachRequestUpdatedAt: now,
        playerId:
          playerId !== undefined
            ? playerId
            : admin.firestore.FieldValue.delete(),
        updatedAt: now,
      },
      { merge: true }
    );

    res.status(200).json({
      success: true,
      data: {
        userId,
        role: resolvedRole,
        coachRequestStatus: resolvedCoachStatus,
      },
    });
  } catch (error) {
    console.error("❌ Erreur lors de la mise à jour du rôle utilisateur:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la mise à jour du rôle utilisateur",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ===== FONCTIONS UTILITAIRES =====

/**
 * Fonction principale de synchronisation des équipes
 */
async function syncTeamsFunction() {
  return await syncTeamsWrapper();
}

/**
 * Fonction principale de synchronisation des matchs par équipe
 */
async function syncTeamMatchesFunction() {
  return await syncTeamMatchesWrapper();
}

/**
 * Fonction principale de synchronisation des joueurs
 */
async function syncPlayers() {
  return await syncPlayersWrapper();
}
