import { jsonNoStore } from "@/lib/http/cache-headers";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";
import { hasAnyRole, USER_ROLES, resolveRole } from "@/lib/auth/roles";
import { BrulageService } from "@/services/brulageService";
import { getBurnRecords, getPlayers } from "@/services/firebase";
import { validateOrigin } from "@/lib/auth/csrf-utils";

export async function POST(req: Request) {
  try {
    // CSRF Protection
    if (!validateOrigin(req)) {
      return jsonNoStore(
        { success: false, error: "Invalid origin" },
        { status: 403 }
      );
    }

    // Auth via cookie de session (__session)
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;
    if (!sessionCookie) {
      return jsonNoStore({ error: "Session cookie requis" }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const role = resolveRole(decoded.role as string | undefined);
    if (!hasAnyRole(role, [USER_ROLES.ADMIN, USER_ROLES.COACH])) {
      return jsonNoStore(
        { error: "Accès refusé", message: "Cette ressource est réservée aux administrateurs et coachs" },
        { status: 403 }
      );
    }

    const { composition, teamNumber, journee, phase } = await req.json();
    if (!composition || !teamNumber || !journee || !phase) {
      return jsonNoStore(
        { error: "Missing required parameters: composition, teamNumber, journee, phase" },
        { status: 400 }
      );
    }

    // Récupérer les données nécessaires
    const [burnRecords, players] = await Promise.all([getBurnRecords(), getPlayers()]);

    // Valider la composition
    const brulageService = new BrulageService(burnRecords, players);
    const validation = brulageService.validateComposition(
      composition,
      teamNumber,
      journee,
      phase
    );

    return jsonNoStore(validation, { status: 200 });
  } catch (error) {
    console.error("[app/api/brulage/validate] Error:", error);
    return jsonNoStore(
      {
        error: "Failed to validate composition",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


