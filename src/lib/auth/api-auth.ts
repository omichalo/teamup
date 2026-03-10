import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";
import { hasAnyRole, resolveRole } from "@/lib/auth/roles";
import type { UserRole } from "@/types";
import type { DecodedIdToken } from "firebase-admin/auth";

export interface ApiAuthResult {
  uid: string;
  email?: string | undefined;
  role: UserRole;
  decodedToken: DecodedIdToken;
}

export async function verifyApiAuth(roles?: UserRole[]): Promise<
  { success: true; auth: ApiAuthResult } | { success: false; response: NextResponse }
> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("__session")?.value;
    if (!session) {
      return { success: false, response: NextResponse.json({ error: "Auth required" }, { status: 401 }) };
    }

    const decoded = await adminAuth.verifySessionCookie(session, true);
    const role = resolveRole(decoded.role as string | undefined);

    if (roles?.length && !hasAnyRole(role, roles)) {
      return { success: false, response: NextResponse.json({ error: "Access denied" }, { status: 403 }) };
    }

    return { success: true, auth: { uid: decoded.uid, email: decoded.email, role, decodedToken: decoded } };
  } catch (error) {
    console.error("[verifyApiAuth] Auth Error:", error);
    return { success: false, response: NextResponse.json({ error: "Invalid session" }, { status: 401 }) };
  }
}
