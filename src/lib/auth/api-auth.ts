import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminAuth, initializeFirebaseAdmin } from "@/lib/firebase-admin";
import { resolveRole, hasAnyRole } from "@/lib/auth/roles";
import { UserRole } from "@/types";

/**
 * Vérifie l'authentification et l'autorisation pour une route API.
 * S'assure que Firebase Admin est initialisé avant toute utilisation.
 */
export async function verifyApiAuth(allowedRoles?: UserRole[]) {
  // S'assurer que Firebase Admin est initialisé (REQUIS avant d'utiliser adminAuth)
  await initializeFirebaseAdmin();

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value;

  if (!sessionCookie) {
    return {
      errorResponse: NextResponse.json(
        { error: "Authentification requise" },
        { status: 401 }
      ),
    };
  }

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);

    if (!decoded.email_verified) {
      return {
        errorResponse: NextResponse.json(
          { error: "Email non vérifié" },
          { status: 403 }
        ),
      };
    }

    const role = resolveRole(decoded.role as string | undefined);

    if (allowedRoles && !hasAnyRole(role, allowedRoles)) {
      return {
        errorResponse: NextResponse.json(
          { error: "Accès refusé", message: "Droits insuffisants" },
          { status: 403 }
        ),
      };
    }

    return { decoded, role };
  } catch (error) {
    console.error("[verifyApiAuth] Session verification error:", error);
    return {
      errorResponse: NextResponse.json(
        { error: "Session invalide" },
        { status: 401 }
      ),
    };
  }
}
