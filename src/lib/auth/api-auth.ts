import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminAuth, initializeFirebaseAdmin } from "@/lib/firebase-admin";
import { hasAnyRole, resolveRole } from "@/lib/auth/roles";
import type { UserRole } from "@/types";
import type { DecodedIdToken } from "firebase-admin/auth";

export interface AuthResult {
  decodedToken?: DecodedIdToken;
  role?: UserRole;
  errorResponse?: NextResponse;
}

/**
 * Utility to verify authentication and authorization in API routes.
 * 🛡️ Sentinel: Centralizes security checks to ensure consistency across endpoints.
 */
export async function verifyApiAuth(
  allowedRoles?: readonly UserRole[],
  requireEmailVerified: boolean = true
): Promise<AuthResult> {
  try {
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

    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);

    if (requireEmailVerified && !decodedToken.email_verified) {
      return {
        errorResponse: NextResponse.json(
          { error: "Email non vérifié" },
          { status: 403 }
        ),
      };
    }

    const role = resolveRole(decodedToken.role as string | undefined);

    if (allowedRoles && !hasAnyRole(role, allowedRoles)) {
      return {
        errorResponse: NextResponse.json(
          { error: "Accès refusé" },
          { status: 403 }
        ),
      };
    }

    return { decodedToken, role };
  } catch (error) {
    console.error("[verifyApiAuth] Authentication error:", error);
    return {
      errorResponse: NextResponse.json(
        { error: "Session invalide ou expirée" },
        { status: 401 }
      ),
    };
  }
}
