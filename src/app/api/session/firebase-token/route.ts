import type { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { requireAuth } from "@/lib/api/auth-middleware";
import { createSecureResponse } from "@/lib/api/response-utils";
import { handleApiError } from "@/lib/api/error-handler";
import { withRateLimit } from "@/lib/api/rate-limit-middleware";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof Response) return auth;

    // Rate limiting par utilisateur (10 requêtes par minute)
    const rateLimitError = withRateLimit({
      key: `firebase-token:${auth.uid}`,
      maxRequests: 10,
      windowMs: 60 * 1000,
    });
    if (rateLimitError) return rateLimitError;
    
    // Créer un custom token pour cet utilisateur
    const customToken = await adminAuth.createCustomToken(auth.uid, {
      role: auth.decoded.role,
      coachRequestStatus: auth.decoded.coachRequestStatus,
    });

    return createSecureResponse({ customToken });
  } catch (error) {
    return handleApiError(error, {
      context: "app/api/session/firebase-token",
      defaultMessage: "Invalid session",
    });
  }
}

