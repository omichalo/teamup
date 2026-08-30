import { cookies } from "next/headers";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { adminAuth, getFirestoreAdmin } from "@/lib/firebase-admin";
import { hasAnyRole, resolveRole, type UserRole } from "@/lib/auth/roles";
import {
  ATTENDANCE_LEAD_MANAGER_ROLES,
  ATTENDANCE_OPERATOR_ROLES,
  ATTENDANCE_CANCELLATION_ROLES,
} from "./access";

export type AttendanceSessionAuth = {
  uid: string;
  role: UserRole;
  db: ReturnType<typeof getFirestoreAdmin>;
};

async function requireAttendanceRoles(
  allowed: readonly UserRole[]
): Promise<
  | { ok: true; session: AttendanceSessionAuth }
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
      session: { uid: decoded.uid, role, db: getFirestoreAdmin() },
    };
  } catch {
    return {
      ok: false,
      response: jsonNoStore({ error: "Session invalide" }, { status: 401 }),
    };
  }
}

export function requireAttendanceOperator() {
  return requireAttendanceRoles(ATTENDANCE_OPERATOR_ROLES);
}

export function requireAttendanceLeadManager() {
  return requireAttendanceRoles(ATTENDANCE_LEAD_MANAGER_ROLES);
}

export function requireAttendanceCancellationManager() {
  return requireAttendanceRoles(ATTENDANCE_CANCELLATION_ROLES);
}

export function invalidOriginResponse() {
  return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
}
