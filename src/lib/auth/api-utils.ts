import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";
import { resolveRole, hasAnyRole, UserRole } from "@/lib/auth/roles";

export const withAuth = (handler: (req: Request, context: unknown) => Promise<NextResponse>, allowedRoles?: UserRole[]) =>
  async (req: Request, context: unknown) => {
    try {
      const session = (await cookies()).get("__session")?.value;
      if (!session) return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
      const decoded = await adminAuth.verifySessionCookie(session, true);
      if (!decoded.email_verified) return NextResponse.json({ error: "Email non vérifié" }, { status: 403 });
      const role = resolveRole(decoded.role as string);
      if (allowedRoles && !hasAnyRole(role, allowedRoles)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      const res = await handler(req, { ... (context as object), decoded, role });
      res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      return res;
    } catch {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }
  };
