import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";
import { hasAnyRole, resolveRole, USER_ROLES } from "@/lib/auth/roles";

export const REGISTRATION_MANAGER_ROLES = [USER_ROLES.ADMIN, USER_ROLES.SECRETARY] as const;

export async function requireRegistrationManager(): Promise<
  | { ok: true; uid: string }
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
    if (!hasAnyRole(role, REGISTRATION_MANAGER_ROLES)) {
      return { ok: false, status: 403, error: "Accès refusé" };
    }

    return { ok: true, uid: decoded.uid };
  } catch {
    return { ok: false, status: 401, error: "Session invalide ou expirée" };
  }
}
