import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";
import { resolveRole } from "@/lib/auth/roles";
import { canAccessLicenseValidation } from "@/lib/license-validation/access";

export async function requireLicenseValidationActor(): Promise<
  | { ok: true; uid: string }
  | { ok: false; status: 401 | 403; error: string }
> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value;
  if (!sessionCookie) {
    return { ok: false, status: 401, error: "Authentification requise" };
  }

  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  const role = resolveRole(decoded.role as string | undefined);
  if (!canAccessLicenseValidation(role)) {
    return { ok: false, status: 403, error: "Accès refusé" };
  }

  return { ok: true, uid: decoded.uid };
}
