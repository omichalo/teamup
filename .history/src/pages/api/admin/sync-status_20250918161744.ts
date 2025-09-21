import { NextApiResponse } from "next";
import { withOptionalAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import {
  initializeFirebaseAdmin,
  getFirestoreAdmin,
} from "@/lib/firebase-admin";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Vérification d'authentification manuelle
  if (!req.user) {
    return res.status(401).json({
      error: "Token d'authentification requis",
      message: "Cette API nécessite une authentification valide",
    });
  }

  try {
    console.log("🔄 Récupération du statut de synchronisation directe...");

    // Initialiser Firebase Admin
    await initializeFirebaseAdmin();

    // Initialiser Firestore
    const db = getFirestoreAdmin();

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
      data: {
        players: {
          lastSync: metadata?.players?.toDate?.()?.toISOString() || null,
          count: playersCount,
        },
        matches: {
          lastSync: metadata?.matches?.toDate?.()?.toISOString() || null,
          count: matchesCount,
        },
      },
    });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération du statut:", error);

    res.status(500).json({
      success: false,
      error: "Erreur lors de la récupération du statut de synchronisation",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default withOptionalAuth(handler);
