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
    // Initialiser Firebase Admin
    await initializeFirebaseAdmin();
    const firestore = getFirestoreAdmin();

    // Récupérer toutes les équipes
    const teamsSnapshot = await firestore.collection("teams").get();
    const teams = teamsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Récupérer tous les matchs de toutes les équipes
    const allMatches = [];
    for (const team of teams) {
      const matchesSnapshot = await firestore
        .collection("teams")
        .doc(team.id)
        .collection("matches")
        .get();

      const teamMatches = matchesSnapshot.docs.map((doc) => ({
        id: doc.id,
        teamId: team.id,
        teamName: team.name,
        ...doc.data(),
      }));

      allMatches.push(...teamMatches);
    }

    res.status(200).json({
      success: true,
      data: allMatches,
      count: allMatches.length,
    });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des matchs:", error);
    res.status(500).json({
      error: "Erreur lors de la récupération des matchs",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default withOptionalAuth(handler);
