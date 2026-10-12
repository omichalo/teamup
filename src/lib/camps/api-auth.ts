import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { adminAuth, getFirestoreAdmin } from "@/lib/firebase-admin";
import { hasAnyRole, resolveRole, type UserRole } from "@/lib/auth/roles";
import { ALL_USER_ROLES } from "@/lib/auth/roles";
import { CAMP_ATTENDANCE_ROLES, CAMP_MANAGER_ROLES } from "./access";

export type CampSessionAuth = {
  uid: string;
  role: UserRole;
  email?: string | undefined;
  db: ReturnType<typeof getFirestoreAdmin>;
};

async function requireCampRoles(
  allowed: readonly UserRole[]
): Promise<
  | { ok: true; session: CampSessionAuth }
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
    if (!hasAnyRole(role, allowed)) {
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
        email: typeof decoded.email === "string" ? decoded.email : undefined,
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

export function requireCampManager() {
  return requireCampRoles(CAMP_MANAGER_ROLES);
}

export function requireCampAttendanceOperator() {
  return requireCampRoles(CAMP_ATTENDANCE_ROLES);
}

export function requireAuthenticatedUser() {
  return requireCampRoles(ALL_USER_ROLES);
}

export function invalidOriginResponse() {
  return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
}

export function parseJsonBody(req: NextRequest): Promise<unknown> {
  return req.json() as Promise<unknown>;
}
