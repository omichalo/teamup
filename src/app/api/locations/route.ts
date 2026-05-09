import { jsonNoStore } from "@/lib/http/cache-headers";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { hasAnyRole, resolveRole, USER_ROLES } from "@/lib/auth/roles";

export const runtime = "nodejs";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;

    if (!sessionCookie) {
      return jsonNoStore(
        { success: false, error: "Authentification requise" },
        { status: 401 }
      );
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    if (!decoded.email_verified) {
      return jsonNoStore(
        { success: false, error: "Email non vérifié" },
        { status: 403 }
      );
    }

    const role = resolveRole(decoded.role as string | undefined);
    if (!hasAnyRole(role, [USER_ROLES.ADMIN, USER_ROLES.COACH])) {
      return jsonNoStore(
        { success: false, error: "Accès refusé" },
        { status: 403 }
      );
    }

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
}
