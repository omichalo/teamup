import { NextApiResponse } from "next";
import { withOptionalAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import {
  getFirestoreAdmin,
  initializeFirebaseAdmin,
} from "@/lib/firebase-admin";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await initializeFirebaseAdmin();
    const firestore = getFirestoreAdmin();

    // Récupérer les équipes depuis Firestore
    const teamsSnapshot = await firestore.collection("teams").get();

    const teams: any[] = [];
    teamsSnapshot.forEach((doc) => {
      const data = doc.data();
      teams.push({
        id: doc.id,
        name: data.name,
        division: data.division,
        isFemale: data.isFemale,
        teamNumber: data.teamNumber,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      });
    });

    // Trier par numéro d&apos;équipe
    teams.sort((a, b) => a.teamNumber - b.teamNumber);

    console.log(`📊 ${teams.length} équipes récupérées depuis Firestore`);

    res.status(200).json({
      teams,
      total: teams.length,
    });
  } catch (error) {
    console.error("Firestore Error:", error);
    res.status(500).json({
      error: "Failed to fetch teams data",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default withOptionalAuth(handler);

