import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { initializeFirebaseAdmin, adminAuth } from "@/lib/firebase-admin";
import { hasAnyRole, resolveRole } from "@/lib/auth/roles";
import type { UserRole } from "@/types";
import type { DecodedIdToken } from "firebase-admin/auth";

/**
 * Secures an API route by verifying the session cookie and user roles.
 * Also adds anti-caching headers to the response.
 */
export async function withAuth(
  handler: (decoded: DecodedIdToken) => Promise<NextResponse>,
  options: {
    allowedRoles?: readonly UserRole[];
    requireEmailVerified?: boolean;
  } = {}
) {
  const { allowedRoles, requireEmailVerified = true } = options;

  try {
    // Ensure Firebase Admin is initialized before any SDK call
    await initializeFirebaseAdmin();

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: "Authentification requise" },
        { status: 401 }
      );
    }

    let decoded;
    try {
      decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    } catch (error) {
      console.error("[withAuth] Session verification failed:", error);
      return NextResponse.json(
        { success: false, error: "Session invalide ou expirée" },
        { status: 401 }
      );
    }

    if (requireEmailVerified && !decoded.email_verified) {
      return NextResponse.json(
        { success: false, error: "Email non vérifié" },
        { status: 403 }
      );
    }

    if (allowedRoles && allowedRoles.length > 0) {
      const role = resolveRole(decoded.role as string | undefined);
      if (!hasAnyRole(role, allowedRoles)) {
        return NextResponse.json(
          { success: false, error: "Accès refusé" },
          { status: 403 }
        );
      }
    }

    const response = await handler(decoded);

    // Apply security headers to the response
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (error) {
    console.error("[withAuth] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
