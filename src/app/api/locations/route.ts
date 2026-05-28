import { jsonNoStore } from "@/lib/http/cache-headers";
import { adminDb } from "@/lib/firebase-admin";
import { USER_ROLES } from "@/lib/auth/roles";
import { withAuth } from "@/lib/auth/api-utils";

export const runtime = "nodejs";

/**
 * GET /api/locations
 * Récupère la liste des lieux (villes) configurés.
 * Accès réservé aux administrateurs et coachs.
 */
export const GET = withAuth(async () => {
  try {
    const locationsRef = adminDb.collection("locations");
    const snapshot = await locationsRef.orderBy("name", "asc").get();

    const locations = snapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name as string,
      createdAt:
        doc.data().createdAt?.toDate?.()?.toISOString() ??
        new Date().toISOString(),
      updatedAt:
        doc.data().updatedAt?.toDate?.()?.toISOString() ??
        new Date().toISOString(),
    }));

    return jsonNoStore({ success: true, locations }, { status: 200 });
  } catch (error) {
    console.error("[app/api/locations] GET error", error);
    return jsonNoStore(
      { success: false, error: "Erreur lors de la récupération des lieux" },
      { status: 500 }
    );
  }
}, [USER_ROLES.ADMIN, USER_ROLES.COACH]);
