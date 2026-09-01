import { cookies } from "next/headers";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { adminAuth, getFirestoreAdmin } from "@/lib/firebase-admin";
import { hasAnyRole, resolveRole, type UserRole } from "@/lib/auth/roles";
import { CLUB_REGISTRATION_SPREADSHEET_ROLES } from "@/lib/club-registration/registration-access";

export type AnalyticsSessionAuth = {
  uid: string;
  role: UserRole;
  db: ReturnType<typeof getFirestoreAdmin>;
};

export async function requireRegistrationAnalyticsAccess(): Promise<
  | { ok: true; session: AnalyticsSessionAuth }
  | { ok: false; response: ReturnType<typeof jsonNoStore> }
> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value;

  if (!sessionCookie) {
    return {
      ok: false,
      response: jsonNoStore({ error: "Authentification requise" }, { status: 401 }),
    };
  }

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const role = resolveRole(decoded.role as string | undefined);
    if (!hasAnyRole(role, CLUB_REGISTRATION_SPREADSHEET_ROLES)) {
      return {
        ok: false,
        response: jsonNoStore({ error: "Accès refusé" }, { status: 403 }),
      };
    }

    return {
      ok: true,
      session: {
        uid: decoded.uid,
        role,
        db: getFirestoreAdmin(),
      },
    };
  } catch {
    return {
      ok: false,
      response: jsonNoStore({ error: "Session invalide" }, { status: 401 }),
    };
  }
}
