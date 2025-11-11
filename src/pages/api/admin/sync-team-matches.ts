import { NextApiResponse } from "next";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
// import { syncTeamMatches } from "@/lib/shared/sync-utils";
import {
  initializeFirebaseAdmin,
  getFirestoreAdmin,
} from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { hasAnyRole, USER_ROLES } from "@/lib/auth/roles";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Vérification d&apos;authentification manuelle
  if (!req.user) {
    return res.status(401).json({
      error: "Token d&apos;authentification requis",
      message: "Cette API nécessite une authentification valide",
    });
  }

  if (!hasAnyRole(req.user.role, [USER_ROLES.ADMIN, USER_ROLES.COACH])) {
    return res.status(403).json({
      error: "Accès refusé",
      message: "Cette opération est réservée aux administrateurs et coachs",
    });
  }

  try {
    console.log("🔄 Déclenchement de la synchronisation des matchs par équipe");

    // Initialiser Firebase Admin
    await initializeFirebaseAdmin();
    const db = getFirestoreAdmin();

    // Utiliser le service partagé
    const { TeamMatchesSyncService } = await import(
      "@/lib/shared/team-matches-sync"
    );
    const teamMatchesSyncService = new TeamMatchesSyncService();
    const syncResult = await teamMatchesSyncService.syncMatchesForAllTeams(db);

    if (!syncResult.success || !syncResult.processedMatches) {
      return res.status(500).json({
        success: false,
        error: "Erreur lors de la synchronisation",
        details: syncResult.error || "Unknown error",
      });
    }

    // Sauvegarder dans les sous-collections des équipes
    const saveResult =
      await teamMatchesSyncService.saveMatchesToTeamSubcollections(
        syncResult.processedMatches,
        db
      );

    // Mettre à jour les métadonnées de synchronisation
    await db
      .collection("metadata")
      .doc("lastSync")
      .set(
        {
          teamMatches: Timestamp.fromDate(new Date()),
          teamMatchesCount: saveResult.saved, // Sauvegarder le count pour éviter de le recalculer
        },
        { merge: true }
      );

    res.status(200).json({
      success: true,
      message: `Synchronisation des matchs réussie: ${saveResult.saved} matchs sauvegardés dans les sous-collections`,
      data: {
        matchesCount: saveResult.saved,
        errors: saveResult.errors,
      },
    });
  } catch (error) {
    console.error("❌ Erreur lors de la synchronisation des matchs:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la synchronisation des matchs",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default withAuth(handler);
