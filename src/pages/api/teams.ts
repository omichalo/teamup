import { NextApiResponse } from "next";
import { withOptionalAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import {
  getFirestoreAdmin,
  initializeFirebaseAdmin,
} from "@/lib/firebase-admin";

interface TeamResponse {
  id: string;
  name: string;
  division: string;
  isFemale?: boolean;
  teamNumber: number;
  createdAt: Date;
  updatedAt: Date;
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await initializeFirebaseAdmin();
    const firestore = getFirestoreAdmin();

    // Récupérer les équipes depuis Firestore
    const teamsSnapshot = await firestore.collection("teams").get();

    const teams: TeamResponse[] = [];
    teamsSnapshot.forEach((doc) => {
      const data = doc.data();
      teams.push({
        id: doc.id,
        name: data.name,
        division: data.division,
        isFemale: data.isFemale,
        teamNumber: data.number || data.teamNumber,
        createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date(),
      });
    });

    // Trier par numéro d&apos;équipe
    teams.sort((a, b) => (a.teamNumber || 0) - (b.teamNumber || 0));

    console.log(`📊 ${teams.length} équipes récupérées depuis Firestore`);

    res.status(200).json({
      teams,
      total: teams.length,
    });
  } catch (error) {
    console.error("Firestore Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Vérifier si c'est une erreur de credentials
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
