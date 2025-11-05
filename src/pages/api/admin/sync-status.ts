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

    // Exécuter toutes les requêtes en parallèle pour optimiser les performances
    const [metadataDoc, playersSnapshot, teamsSnapshot] = await Promise.all([
      db.collection("metadata").doc("lastSync").get(),
      db.collection("players").get(),
      db.collection("teams").get(),
    ]);

    const metadata = metadataDoc.exists ? metadataDoc.data() : {};
    const playersCount = playersSnapshot.size;
    const teamsCount = teamsSnapshot.size;

    // Pour les matchs, on utilise une approche plus rapide :
    // On récupère seulement les métadonnées de synchronisation qui contiennent déjà le count
    // Au lieu de compter tous les matchs individuellement
    const teamMatchesCount = metadata?.teamMatchesCount || 0;

    console.log(
      `✅ Statut récupéré: ${playersCount} joueurs, ${teamsCount} équipes, ${teamMatchesCount} matchs par équipe`
    );

    res.status(200).json({
      success: true,
      data: {
        players: {
          lastSync: metadata?.players?.toDate?.()?.toISOString() || null,
          count: playersCount,
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
