export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth/api-utils";
import { USER_ROLES } from "@/lib/auth/roles";

export const GET = withAuth(async () => {
  try {
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
    console.error("❌ [app/api/admin/sync-status] Erreur:", error);
    return jsonNoStore(
      {
        success: false,
        error: "Erreur lors de la récupération du statut de synchronisation",
      },
      { status: 500 }
    );
  }
}, [USER_ROLES.ADMIN]);
