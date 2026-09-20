import type { Firestore } from "firebase-admin/firestore";
import { cookies } from "next/headers";
import { adminAuth, getFirestoreAdmin } from "@/lib/firebase-admin";
import { fetchUserDisplayName } from "@/lib/auth/resolve-display-name";
import {
  canAccessAppSuggestions,
  resolveClubReferentFlag,
} from "@/lib/app-suggestions/access";
import { isUserAppMaintainer } from "@/lib/app-suggestions/maintainer";
import { resolveRole } from "@/lib/auth/roles";
import type { UserRole } from "@/types";
import type { SuggestionViewerContext } from "@/lib/app-suggestions/visibility";

export type SuggestionSessionContext = {
  uid: string;
  role: UserRole;
  displayName: string | null;
  isMaintainer: boolean;
  isClubReferent: boolean;
  db: Firestore;
};

export function toSuggestionViewer(
  session: SuggestionSessionContext
): SuggestionViewerContext {
  return {
    uid: session.uid,
    role: session.role,
    isMaintainer: session.isMaintainer,
    isClubReferent: session.isClubReferent,
  };
}

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
    if (!decoded.email_verified) {
      return { ok: false, status: 403, error: "Email non vérifié" };
    }

    const role = resolveRole(decoded.role as string | undefined);
    if (!canAccessAppSuggestions(role)) {
      return { ok: false, status: 403, error: "Accès refusé" };
    }

    const db = getFirestoreAdmin();
    const isMaintainer = await isUserAppMaintainer(db, decoded.uid);
    const isClubReferent = resolveClubReferentFlag(role);
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
        isClubReferent,
        db,
      },
    };
  } catch {
    return { ok: false, status: 401, error: "Session invalide" };
  }
}
