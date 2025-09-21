import { NextApiResponse } from "next";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log(
      "🔄 Déclenchement de la synchronisation des matchs via Cloud Function"
    );

    // Appeler la Cloud Function pour synchroniser les matchs
    const functionUrl = `https://us-central1-${
      process.env.FIREBASE_PROJECT_ID || "sqyping-teamup"
    }.cloudfunctions.net/triggerMatchSync`;

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
        message: "Synchronisation des matchs déclenchée avec succès",
        ...result,
      });
    } else {
      res.status(500).json({
        error: "Erreur lors de la synchronisation des matchs",
        details: result.error || "Erreur inconnue",
      });
    }
  } catch (error) {
    console.error("❌ Erreur lors de la synchronisation des matchs:", error);
    res.status(500).json({
      error: "Erreur lors de la synchronisation des matchs",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default withAuth(handler);
