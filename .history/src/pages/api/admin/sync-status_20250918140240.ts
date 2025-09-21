import { NextApiRequest, NextApiResponse } from "next";
import { initializeFirebaseAdmin, getFirestore } from "@/lib/firebase-admin";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Vérifier l'authentification via le header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ 
        error: "Token d'authentification requis",
        message: "Cette API nécessite une authentification valide"
      });
    }

    const token = authHeader.split(" ")[1];
    
    // Initialiser Firebase Admin
    const admin = await initializeFirebaseAdmin();
    const db = getFirestore(admin);

    // Vérifier le token Firebase
    const decodedToken = await admin.auth().verifyIdToken(token);
    console.log("✅ Utilisateur authentifié:", decodedToken.email);

    console.log("🔄 Récupération du statut de synchronisation...");

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
          lastSync: metadata.players?.toDate?.()?.toISOString() || null,
          count: metadata.playersCount || playersCount,
        },
        matches: {
          lastSync: metadata.matches?.toDate?.()?.toISOString() || null,
          count: metadata.matchesCount || matchesCount,
        },
      },
    });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération du statut:", error);
    
    // Si c'est une erreur d'authentification
    if (error instanceof Error && error.message.includes("auth")) {
      return res.status(401).json({
        success: false,
        error: "Token d'authentification invalide",
        details: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      error: "Erreur lors de la récupération du statut de synchronisation",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
