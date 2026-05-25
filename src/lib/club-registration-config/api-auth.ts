import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { adminAuth } from "@/lib/firebase-admin";
import { hasAnyRole, resolveRole } from "@/lib/auth/roles";
import { CLUB_REGISTRATION_MANAGER_ROLES } from "@/lib/club-registration/registration-access";

export type ManagerSession = {
  uid: string;
  role: ReturnType<typeof resolveRole>;
};

export async function requireRegistrationManager(): Promise<
  | { ok: true; session: ManagerSession }
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
    if (!decoded.email_verified) {
      return {
        ok: false,
        response: jsonNoStore({ error: "Email non vérifié" }, { status: 403 }),
      };
    }

    const role = resolveRole(decoded.role as string | undefined);
    if (!hasAnyRole(role, CLUB_REGISTRATION_MANAGER_ROLES)) {
      return {
        ok: false,
        response: jsonNoStore({ error: "Accès refusé" }, { status: 403 }),
      };
    }

    return { ok: true, session: { uid: decoded.uid, role } };
  } catch {
    return {
      ok: false,
      response: jsonNoStore({ error: "Session invalide" }, { status: 401 }),
    };
  }
}

export function invalidOriginResponse(): ReturnType<typeof jsonNoStore> {
  return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
}

export function parseJsonBody(req: NextRequest): Promise<unknown> {
  return req.json() as Promise<unknown>;
}
