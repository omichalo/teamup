import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";

// Rate limiting simple en mémoire (pour éviter les abus)
// En production, utilisez un service dédié comme Redis
const tokenRequests = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // Max 10 requêtes par minute

function checkRateLimit(uid: string): boolean {
  const now = Date.now();
  const userLimit = tokenRequests.get(uid);

  if (!userLimit || now > userLimit.resetAt) {
    tokenRequests.set(uid, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  userLimit.count++;
  return true;
}

export async function GET() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get("__session")?.value;

  if (!cookie) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  try {
    const decoded = await adminAuth.verifySessionCookie(cookie, true);
    
    // Rate limiting par utilisateur
    if (!checkRateLimit(decoded.uid)) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }
    
    // Créer un custom token pour cet utilisateur
    const customToken = await adminAuth.createCustomToken(decoded.uid, {
      role: decoded.role,
      coachRequestStatus: decoded.coachRequestStatus,
    });

    return NextResponse.json({ customToken });
  } catch (error) {
    console.error("[session/firebase-token] Error:", error);
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }
}

