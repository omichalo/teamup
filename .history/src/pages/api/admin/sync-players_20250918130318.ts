import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log(
      "🔄 Déclenchement de la synchronisation des joueurs via Cloud Function"
    );

    // Appeler la Cloud Function pour synchroniser les joueurs
    const functionUrl = `https://us-central1-${
      process.env.FIREBASE_PROJECT_ID || "sqyping-teamup"
    }.cloudfunctions.net/syncPlayersManual`;

    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();

    if (response.ok) {
      res.status(200).json({
        success: true,
        message: "Synchronisation des joueurs déclenchée avec succès",
        ...result,
      });
    } else {
      res.status(500).json({
        error: "Erreur lors de la synchronisation des joueurs",
        details: result.error || "Erreur inconnue",
      });
    }
  } catch (error) {
    console.error("❌ Erreur lors de la synchronisation des joueurs:", error);
    res.status(500).json({
      error: "Erreur lors de la synchronisation des joueurs",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
