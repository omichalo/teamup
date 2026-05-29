import { jsonNoStore } from "@/lib/http/cache-headers";
import { adminDb } from "@/lib/firebase-admin";
import { USER_ROLES } from "@/lib/auth/roles";
import { withAuth } from "@/lib/auth/api-utils";

export const runtime = "nodejs";

export const GET = withAuth(async () => {
  try {
    console.log("🔄 [app/api/admin/sync-status] Récupération du statut de synchronisation directe...");

    const [metadataDoc, playersSnapshot, teamsSnapshot] = await Promise.all([
      adminDb.collection("metadata").doc("lastSync").get(),
      adminDb.collection("players").get(),
      adminDb.collection("teams").get(),
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
    return jsonNoStore(
      {
        success: false,
        error: "Erreur lors de la récupération du statut de synchronisation",
      },
      { status: 500 }
    );
  }
}, [USER_ROLES.ADMIN]);


