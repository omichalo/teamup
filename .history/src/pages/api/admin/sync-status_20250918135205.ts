import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Pour l'instant, retournons des données statiques
    // TODO: Implémenter la récupération depuis Firestore une fois la config Firebase Admin résolue
    
    res.status(200).json({
      success: true,
      data: {
        players: {
          lastSync: null, // À implémenter
          count: 0, // À implémenter
        },
        matches: {
          lastSync: null, // À implémenter
          count: 0, // À implémenter
        },
      },
      message: "Configuration Firebase Admin nécessaire pour récupérer les données réelles"
    });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération du statut:", error);
    res.status(500).json({
      error: "Erreur lors de la récupération du statut",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
