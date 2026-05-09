import { jsonNoStore } from "@/lib/http/cache-headers";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import {
  enforceRateLimit,
  RATE_LIMIT_FIREBASE_CUSTOM_TOKEN_PER_UID,
} from "@/lib/auth/rate-limit-http";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Valider l'origine de la requête pour prévenir les attaques CSRF
  if (!validateOrigin(req)) {
    return jsonNoStore(
      { error: "Invalid origin" },
      { status: 403 }
    );
  }

  const cookieStore = await cookies();
  const cookie = cookieStore.get("__session")?.value;

  if (!cookie) {
    return jsonNoStore({ error: "No session" }, { status: 401 });
  }

  try {
    const decoded = await adminAuth.verifySessionCookie(cookie, true);

    const limited = enforceRateLimit(
      `session:firebase-token:${decoded.uid}`,
      RATE_LIMIT_FIREBASE_CUSTOM_TOKEN_PER_UID.max,
      RATE_LIMIT_FIREBASE_CUSTOM_TOKEN_PER_UID.windowMs
    );
    if (limited) return limited;

    // Créer un custom token pour cet utilisateur
    const customToken = await adminAuth.createCustomToken(decoded.uid, {
      role: decoded.role,
      coachRequestStatus: decoded.coachRequestStatus,
    });

    return jsonNoStore({ customToken });
  } catch (error) {
    console.error("[session/firebase-token] Error:", error);
    return jsonNoStore({ error: "Invalid session" }, { status: 401 });
  }
}
