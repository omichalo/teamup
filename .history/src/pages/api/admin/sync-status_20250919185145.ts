import { NextApiResponse } from "next";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import {
  initializeFirebaseAdmin,
  getFirestoreAdmin,
} from "@/lib/firebase-admin";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🔄 Récupération du statut de synchronisation directe...");

    // Initialiser Firebase Admin
    await initializeFirebaseAdmin();

    // Initialiser Firestore
    const db = getFirestoreAdmin();

    // Récupérer les métadonnées de synchronisation
    const metadataDoc = await db.collection("metadata").doc("lastSync").get();
    const metadata = metadataDoc.exists ? metadataDoc.data() : {};

    // Récupérer le nombre de joueurs
    const playersSnapshot = await db.collection("players").get();
    const playersCount = playersSnapshot.size;

    // Récupérer le nombre de matchs
    const matchesSnapshot = await db.collection("matches").get();
    const matchesCount = matchesSnapshot.size;

    // Récupérer le nombre d'équipes
    const teamsSnapshot = await db.collection("teams").get();
    const teamsCount = teamsSnapshot.size;

    // Récupérer le nombre de matchs par équipe (compter dans toutes les sous-collections)
    let teamMatchesCount = 0;
    const teams = await db.collection("teams").get();
    for (const teamDoc of teams.docs) {
      const matchesSnapshot = await db
        .collection("teams")
        .doc(teamDoc.id)
        .collection("matches")
        .get();
      teamMatchesCount += matchesSnapshot.size;
    }

    console.log(
      `✅ Statut récupéré: ${playersCount} joueurs, ${matchesCount} matchs, ${teamsCount} équipes, ${teamMatchesCount} matchs par équipe`
    );

    res.status(200).json({
      success: true,
      data: {
        players: {
          lastSync: metadata?.players?.toDate?.()?.toISOString() || null,
          count: playersCount,
        },
        matches: {
          lastSync: metadata?.matches?.toDate?.()?.toISOString() || null,
          count: matchesCount,
        },
        teams: {
          lastSync: metadata?.teams?.toDate?.()?.toISOString() || null,
          count: teamsCount,
        },
        teamMatches: {
          lastSync: metadata?.teamMatches?.toDate?.()?.toISOString() || null,
          count: teamMatchesCount,
        },
      },
    });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération du statut:", error);

    res.status(500).json({
      success: false,
      error: "Erreur lors de la récupération du statut de synchronisation",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default withAuth(handler);
