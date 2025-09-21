import { NextApiRequest, NextApiResponse } from "next";

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
    
    // Pour l'instant, utilisons une approche simple avec les Cloud Functions
    // qui ont déjà accès à Firestore avec les bonnes permissions
    console.log("🔄 Récupération du statut de synchronisation via Cloud Function...");

    // Appeler une Cloud Function qui retourne le statut
    const functionUrl = `https://us-central1-${
      process.env.FIREBASE_PROJECT_ID || "sqyping-teamup"
    }.cloudfunctions.net/getSyncStatus`;

    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error(`Cloud Function error: ${response.status}`);
    }

    const result = await response.json();
    const { playersCount, matchesCount, lastSync } = result;

    console.log(
      `✅ Statut récupéré: ${playersCount} joueurs, ${matchesCount} matchs`
    );

    res.status(200).json({
      success: true,
      data: {
        players: {
          lastSync: lastSync.players,
          count: playersCount,
        },
        matches: {
          lastSync: lastSync.matches,
          count: matchesCount,
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
