import type { NextRequest } from "next/server";
import { initializeFirebaseAdmin, getFirestoreAdmin } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/api/auth-middleware";
import { createSecureResponse } from "@/lib/api/response-utils";
import { handleApiError } from "@/lib/api/error-handler";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (auth instanceof Response) return auth;

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

    return createSecureResponse(
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
      200
    );
  } catch (error) {
    return handleApiError(error, {
      context: "app/api/admin/sync-status",
      defaultMessage: "Erreur lors de la récupération du statut de synchronisation",
    });
  }
}


