import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/admin",
  "/compositions",
  "/disponibilites",
  "/equipes",
  "/joueurs",
  "/joueur",
  "/settings",
]; // <-- ajuste selon tes besoins

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get("__session")?.value;
  if (!cookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  try {
    const decoded = await adminAuth.verifySessionCookie(cookie, true);
    if (!decoded.email_verified) throw new Error("not verified");
    return NextResponse.next();
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, icon.png, icon.svg, apple-icon.png, apple-icon.svg (favicon files)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|icon.png|icon.svg|apple-icon.png|apple-icon.svg).*)",
  ],
};

