import { jsonNoStore } from "@/lib/http/cache-headers";
import { initializeFirebaseAdmin, getFirestoreAdmin } from "@/lib/firebase-admin";
import { USER_ROLES } from "@/lib/auth/roles";
import { withAuth } from "@/lib/auth/api-utils";

export const runtime = "nodejs";

/**
 * GET /api/admin/sync-status
 *
 * Returns the last synchronization status for players, teams and matches.
 * Restricted to ADMIN role.
 */
export const GET = withAuth(async () => {
  try {
    console.log("🔄 [app/api/admin/sync-status] Récupération du statut de synchronisation directe...");

    await initializeFirebaseAdmin();
    const db = getFirestoreAdmin();

    const [metadataDoc, playersSnapshot, teamsSnapshot] = await Promise.all([
      db.collection("metadata").doc("lastSync").get(),
      db.collection("players").get(),
      db.collection("teams").get(),
    ]);

    const metadata = metadataDoc.exists ? metadataDoc.data() : {};
    const playersCount = playersSnapshot.size;
    const teamsCount = teamsSnapshot.size;
    const teamMatchesCount = metadata?.teamMatchesCount || 0;

    console.log(
      `✅ Statut récupéré: ${playersCount} joueurs, ${teamsCount} équipes, ${teamMatchesCount} matchs par équipe`
    );

    return jsonNoStore(
      {
        success: true,
        data: {
          players: {
            lastSync: metadata?.players?.toDate?.()?.toISOString() || null,
            count: playersCount,
            duration: metadata?.playersDuration || null,
          },
          teams: {
            lastSync: metadata?.teams?.toDate?.()?.toISOString() || null,
            count: teamsCount,
            duration: metadata?.teamsDuration || null,
          },
          teamMatches: {
            lastSync: metadata?.teamMatches?.toDate?.()?.toISOString() || null,
            count: teamMatchesCount,
            duration: metadata?.teamMatchesDuration || null,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ [app/api/admin/sync-status] Erreur lors de la récupération du statut:", error);
    // Secure error response: do not leak internal error message details
    return jsonNoStore(
      {
        success: false,
        error: "Erreur lors de la récupération du statut de synchronisation",
      },
      { status: 500 }
    );
  }
}, [USER_ROLES.ADMIN]);
