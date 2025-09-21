import { NextApiResponse } from "next";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🧹 Déclenchement du nettoyage des doublons de joueurs");

    // Appeler la Cloud Function pour nettoyer les doublons
    const functionUrl = `https://us-central1-${
      process.env.FIREBASE_PROJECT_ID || "sqyping-teamup"
    }.cloudfunctions.net/cleanupDuplicatePlayers`;

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
        message: "Nettoyage des doublons terminé",
        ...result,
      });
    } else {
      res.status(500).json({
        error: "Erreur lors du nettoyage des doublons",
        details: result.error || "Erreur inconnue",
      });
    }
  } catch (error) {
    console.error("❌ Erreur lors du nettoyage des doublons:", error);
    res.status(500).json({
      error: "Erreur lors du nettoyage des doublons",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default withAuth(handler);
