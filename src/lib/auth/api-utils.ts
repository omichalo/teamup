import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";
import { resolveRole, hasAnyRole, UserRole } from "@/lib/auth/roles";
import { applyNoStoreHeaders, jsonNoStore } from "@/lib/http/cache-headers";

export const withAuth = (handler: (req: Request, context: unknown) => Promise<NextResponse>, allowedRoles?: UserRole[]) =>
  async (req: Request, context: unknown) => {
    try {
      const session = (await cookies()).get("__session")?.value;
      if (!session) return jsonNoStore({ error: "Authentication required" }, { status: 401 });
      const decoded = await adminAuth.verifySessionCookie(session, true);
      if (!decoded.email_verified) return jsonNoStore({ error: "Email not verified" }, { status: 403 });
      const role = resolveRole(decoded.role as string | undefined);
      if (allowedRoles && !hasAnyRole(role, allowedRoles)) return jsonNoStore({ error: "Access denied" }, { status: 403 });
      const res = await handler(req, { ... (context as object), decoded, role });
      return applyNoStoreHeaders(res);
    } catch {
      return jsonNoStore({ error: "Invalid session" }, { status: 401 });
    }
  };
