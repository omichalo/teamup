export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { cookies } from "next/headers";
import { initializeFirebaseAdmin, getFirestoreAdmin, adminAuth } from "@/lib/firebase-admin";
import { hasAnyRole, USER_ROLES, resolveRole } from "@/lib/auth/roles";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;
    if (!sessionCookie) {
      return jsonNoStore(
        { error: "Session cookie requis" },
        { status: 401 }
      );
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const role = resolveRole(decoded.role as string | undefined);

    if (!hasAnyRole(role, [USER_ROLES.ADMIN])) {
      return jsonNoStore(
        {
          success: false,
          error: "Accès refusé",
          message: "Cette ressource est réservée aux administrateurs",
        },
        { status: 403 }
      );
    }

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
    return jsonNoStore(
      {
        success: false,
        error: "Erreur lors de la récupération du statut de synchronisation",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


