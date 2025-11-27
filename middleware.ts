import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { USER_ROLES, resolveRole, hasAnyRole } from "@/lib/auth/roles";
import { validateInternalRedirect } from "@/lib/auth/redirect-utils";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/admin",
  "/compositions",
  "/disponibilites",
  "/equipes",
  "/joueurs",
  "/joueur",
  "/settings",
];

// Routes publiques qui ne nécessitent pas d'authentification
const PUBLIC_ROUTES = [
  "/login",
  "/signup",
  "/reset",
  "/reset-password",
  "/auth/verify-email",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Exclure les routes publiques
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Protéger la racine et les autres préfixes protégés
  const isProtected =
    pathname === "/" || PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (!isProtected) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get("__session")?.value;
  if (!cookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    // Valider le pathname pour éviter les open redirects
    const safeNext = validateInternalRedirect(pathname);
    url.searchParams.set("next", safeNext);
    return NextResponse.redirect(url);
  }

  try {
    const decoded = await adminAuth.verifySessionCookie(cookie, true);
    if (!decoded.email_verified) throw new Error("not verified");

    const role = resolveRole(decoded.role as string | undefined);

    // Vérification de rôle pour la route /admin (admin uniquement)
    if (pathname.startsWith("/admin")) {
      if (!hasAnyRole(role, [USER_ROLES.ADMIN])) {
        // Rediriger vers la page d'accueil si l'utilisateur n'est pas admin
        const url = req.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
      }
    }

    // Vérification de rôle pour les pages admin/coach (compositions, disponibilites, joueurs, equipes)
    const adminCoachPages = ["/compositions", "/disponibilites", "/joueurs", "/equipes"];
    if (adminCoachPages.some((page) => pathname.startsWith(page))) {
      if (!hasAnyRole(role, [USER_ROLES.ADMIN, USER_ROLES.COACH])) {
        // Rediriger vers la page joueur si l'utilisateur est un joueur, sinon vers la page d'accueil
        const url = req.nextUrl.clone();
        url.pathname = hasAnyRole(role, [USER_ROLES.PLAYER]) ? "/joueur" : "/";
        return NextResponse.redirect(url);
      }
    }

    return NextResponse.next();
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    // Valider le pathname pour éviter les open redirects
    const safeNext = validateInternalRedirect(pathname);
    url.searchParams.set("next", safeNext);
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

