import { cookies } from "next/headers";
import { adminAuth, getFirestoreAdmin } from "@/lib/firebase-admin";
import { createSecureResponse } from "@/lib/api/response-utils";

export const runtime = "nodejs";

// Cache simple en mémoire pour éviter les appels Firestore répétés
// Cache valide pendant 5 secondes
const cache = new Map<
  string,
  { data: unknown; timestamp: number }
>();
const CACHE_TTL = 5000; // 5 secondes

function getCachedUser(uid: string): unknown | null {
  const cached = cache.get(uid);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  if (cached) {
    cache.delete(uid);
  }
  return null;
}

function setCachedUser(uid: string, data: unknown): void {
  cache.set(uid, { data, timestamp: Date.now() });
}

export async function GET() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get("__session")?.value;

  if (!cookie) {
    return createSecureResponse({ user: null });
  }

  try {
    const decoded = await adminAuth.verifySessionCookie(cookie, true);
    if (!decoded.email_verified) {
      return createSecureResponse({ user: null });
    }

    // Vérifier le cache d'abord
    const cachedUser = getCachedUser(decoded.uid);
    if (cachedUser) {
      return createSecureResponse({ user: cachedUser });
    }

    // Essayer de récupérer les informations utilisateur depuis Firestore
    // Mais utiliser les données du token en fallback si l'appel échoue
    let userData: Record<string, unknown> | null = null;
    try {
      const db = getFirestoreAdmin();
      const userDoc = await db.collection("users").doc(decoded.uid).get();

      if (userDoc.exists) {
        userData = userDoc.data() as Record<string, unknown>;
      }
    } catch (firestoreError: unknown) {
      // Gérer spécifiquement l'erreur de quota
      const error = firestoreError as { code?: number; message?: string };
      if (error.code === 8 || error.message?.includes("RESOURCE_EXHAUSTED") || error.message?.includes("Quota exceeded")) {
        console.warn(
          `[session/verify] Firestore quota exceeded for user ${decoded.uid}, using token data as fallback`
        );
        // Continuer avec les données du token
      } else {
        // Pour les autres erreurs, logger et continuer avec le token
        console.error("[session/verify] Firestore error:", error);
      }
    }

    // Construire la réponse utilisateur
    let coachRequestUpdatedAt: string | null = null;
    if (userData?.coachRequestUpdatedAt) {
      if (userData.coachRequestUpdatedAt && typeof userData.coachRequestUpdatedAt === "object" && "toDate" in userData.coachRequestUpdatedAt) {
        // Timestamp Firestore
        coachRequestUpdatedAt = (userData.coachRequestUpdatedAt as { toDate: () => Date }).toDate().toISOString();
      } else if (userData.coachRequestUpdatedAt instanceof Date) {
        // Déjà une Date
        coachRequestUpdatedAt = userData.coachRequestUpdatedAt.toISOString();
      } else if (typeof userData.coachRequestUpdatedAt === "string") {
        // Déjà une string ISO
        coachRequestUpdatedAt = userData.coachRequestUpdatedAt;
      }
    }

    const user = {
      uid: decoded.uid,
      email: decoded.email || (userData?.email as string | undefined),
      role: (userData?.role as string | undefined) || decoded.role || "player",
      coachRequestStatus:
        (userData?.coachRequestStatus as string | undefined) ||
        decoded.coachRequestStatus ||
        "none",
      coachRequestMessage: (userData?.coachRequestMessage as string | undefined) || null,
      coachRequestUpdatedAt,
    };

    // Mettre en cache uniquement si on a réussi à récupérer les données Firestore
    if (userData) {
      setCachedUser(decoded.uid, user);
    }

    return createSecureResponse({ user });
  } catch (error) {
    console.error("[session/verify] Error:", error);
    return createSecureResponse({ user: null });
  }
}
