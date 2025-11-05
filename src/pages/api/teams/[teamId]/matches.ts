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

  const { teamId } = req.query;

  if (!teamId || typeof teamId !== "string") {
    return res.status(400).json({ error: "Team ID parameter is required" });
  }

  try {
    await initializeFirebaseAdmin();
    const firestore = getFirestoreAdmin();

    // Récupérer les matchs de l&apos;équipe depuis la sous-collection
    const matchesSnapshot = await firestore
      .collection("teams")
      .doc(teamId)
      .collection("matches")
      .get();

    const matches: any[] = [];
    matchesSnapshot.forEach((doc) => {
      const data = doc.data();
      matches.push({
        id: doc.id,
        ffttId: data.ffttId,
        teamNumber: data.teamNumber,
        opponent: data.opponent,
        opponentClub: data.opponentClub,
        date: data.date?.toDate() || new Date(),
        location: data.location,
        isHome: data.isHome,
        isExempt: data.isExempt,
        isForfeit: data.isForfeit,
        phase: data.phase,
        journee: data.journee,
        isFemale: data.isFemale,
        division: data.division,
        teamId: data.teamId,
        epreuve: data.epreuve,
        score: data.score,
        result: data.result,
        rencontreId: data.rencontreId,
        equipeIds: data.equipeIds,
        lienDetails: data.lienDetails,
        resultatsIndividuels: data.resultatsIndividuels,
        joueursSQY: data.joueursSQY || [],
        joueursAdversaires: data.joueursAdversaires || [],
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      });
    });

    // Trier par date
    matches.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    console.log(
      `📊 ${matches.length} matchs récupérés pour l&apos;équipe ${teamId}`
    );

    res.status(200).json({
      teamId,
      matches,
      total: matches.length,
    });
  } catch (error) {
    console.error("Firestore Error:", error);
    res.status(500).json({
      error: "Failed to fetch team matches",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default withOptionalAuth(handler);

