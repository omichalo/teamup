import type { Firestore } from "firebase-admin/firestore";
import { cookies } from "next/headers";
import { adminAuth, getFirestoreAdmin } from "@/lib/firebase-admin";
import { fetchUserDisplayName } from "@/lib/auth/resolve-display-name";
import { canAccessAppSuggestions } from "@/lib/app-suggestions/access";
import { isUserAppMaintainer } from "@/lib/app-suggestions/maintainer";
import { resolveRole } from "@/lib/auth/roles";
import type { UserRole } from "@/types";

export type SuggestionSessionContext = {
  uid: string;
  role: UserRole;
  displayName: string | null;
  isMaintainer: boolean;
  db: Firestore;
};

export async function resolveSuggestionSession(): Promise<
  | { ok: true; session: SuggestionSessionContext }
  | { ok: false; status: 401 | 403; error: string }
> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value;
  if (!sessionCookie) {
    return { ok: false, status: 401, error: "Authentification requise" };
  }

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const role = resolveRole(decoded.role as string | undefined);
    if (!canAccessAppSuggestions(role)) {
      return { ok: false, status: 403, error: "Accès refusé" };
    }

    const db = getFirestoreAdmin();
    const isMaintainer = await isUserAppMaintainer(db, decoded.uid);
    const displayName = await fetchUserDisplayName(db, decoded.uid, {
      tokenName: typeof decoded.name === "string" ? decoded.name : null,
      email: typeof decoded.email === "string" ? decoded.email : null,
    });

    return {
      ok: true,
      session: {
        uid: decoded.uid,
        role,
        displayName,
        isMaintainer,
        db,
      },
    };
  } catch {
    return { ok: false, status: 401, error: "Session invalide" };
  }
}
