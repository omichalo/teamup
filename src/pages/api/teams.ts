import { NextApiResponse } from "next";
import { withOptionalAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import {
  getFirestoreAdmin,
  initializeFirebaseAdmin,
} from "@/lib/firebase-admin";
import { getTeams, TeamSummary } from "@/lib/server/team-matches";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await initializeFirebaseAdmin();
    const firestore = getFirestoreAdmin();

    const teams: TeamSummary[] = await getTeams(firestore);

    console.log(`📊 ${teams.length} équipes récupérées depuis Firestore`);

    res.status(200).json({
      teams,
      total: teams.length,
    });
  } catch (error) {
    console.error("Firestore Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    if (
      errorMessage.includes("credentials") ||
      errorMessage.includes("Could not load the default credentials")
    ) {
      return res.status(500).json({
        error: "Firebase Admin credentials not configured",
        details:
          "Pour le développement local, configurez les credentials Firebase Admin. Voir README.md pour plus d'informations.",
        message: errorMessage,
      });
    }

    res.status(500).json({
      error: "Failed to fetch teams data",
      details: errorMessage,
    });
  }
}

export default withOptionalAuth(handler);
