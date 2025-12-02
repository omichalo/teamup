import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { hasAnyRole, USER_ROLES, resolveRole } from "@/lib/auth/roles";
import type { UserRole } from "@/types";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import type { DecodedIdToken } from "firebase-admin/auth";

/**
 * Résultat de l'authentification
 */
export interface AuthResult {
  decoded: DecodedIdToken;
  role: UserRole;
  uid: string;
}

/**
 * Options pour requireAuth
 */
export interface RequireAuthOptions {
  /**
   * Rôles autorisés. Si non spécifié, tous les utilisateurs authentifiés sont autorisés.
   */
  allowedRoles?: readonly UserRole[];
  /**
   * Si true, valide l'origine de la requête (CSRF protection).
   * Par défaut: true pour les mutations (POST, PATCH, DELETE, PUT)
   */
  validateCSRF?: boolean;
  /**
   * Si true, exige que l'email de l'utilisateur soit vérifié.
   * Par défaut: false
   */
  requireEmailVerified?: boolean;
  /**
   * Message d'erreur personnalisé pour l'authentification
   */
  authErrorMessage?: string;
  /**
   * Message d'erreur personnalisé pour l'autorisation
   */
  authorizationErrorMessage?: string;
  /**
   * Message d'erreur personnalisé pour l'email non vérifié
   */
  emailVerifiedErrorMessage?: string;
}

/**
 * Authentifie l'utilisateur et vérifie les rôles si nécessaire.
 * 
 * @param req - La requête Next.js
 * @param options - Options d'authentification
 * @returns AuthResult si l'authentification réussit, NextResponse si elle échoue
 */
export async function requireAuth(
  req: NextRequest,
  options: RequireAuthOptions = {}
): Promise<AuthResult | NextResponse> {
  const {
    allowedRoles,
    validateCSRF = ["POST", "PATCH", "DELETE", "PUT"].includes(req.method),
    requireEmailVerified = false,
    authErrorMessage = "Token d'authentification requis",
    authorizationErrorMessage = "Accès refusé",
    emailVerifiedErrorMessage = "Email non vérifié",
  } = options;

  // Validation CSRF pour les mutations
  if (validateCSRF && !validateOrigin(req)) {
    return NextResponse.json(
      {
        error: "Invalid origin",
        message: "Requête non autorisée",
      },
      { status: 403 }
    );
  }

  // Récupérer le cookie de session
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value;

  if (!sessionCookie) {
    return NextResponse.json(
      {
        error: "Token d'authentification requis",
        message: authErrorMessage,
      },
      { status: 401 }
    );
  }

  try {
    // Vérifier le cookie de session
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const role = resolveRole(decoded.role as string | undefined);

    // Vérifier l'email vérifié si requis
    if (requireEmailVerified && !decoded.email_verified) {
      return NextResponse.json(
        {
          error: "Email non vérifié",
          message: emailVerifiedErrorMessage,
        },
        { status: 403 }
      );
    }

    // Vérifier les rôles si spécifiés
    if (allowedRoles && allowedRoles.length > 0) {
      if (!hasAnyRole(role, allowedRoles)) {
        const roleNames = allowedRoles.join(" ou ");
        return NextResponse.json(
          {
            error: "Accès refusé",
            message: authorizationErrorMessage || `Cette opération est réservée aux ${roleNames}`,
          },
          { status: 403 }
        );
      }
    }

    return {
      decoded,
      role,
      uid: decoded.uid,
    };
  } catch (error) {
    console.error("[auth-middleware] Erreur de vérification de session:", error);
    return NextResponse.json(
      {
        error: "Session invalide",
        message: "Votre session a expiré ou est invalide",
      },
      { status: 401 }
    );
  }
}

/**
 * Wrapper pour les routes nécessitant uniquement l'authentification ADMIN.
 * 
 * @param req - La requête Next.js
 * @returns AuthResult si l'authentification réussit, NextResponse si elle échoue
 */
export async function requireAdmin(
  req: NextRequest
): Promise<AuthResult | NextResponse> {
  return requireAuth(req, {
    allowedRoles: [USER_ROLES.ADMIN],
    authorizationErrorMessage: "Cette opération est réservée aux administrateurs",
  });
}

/**
 * Wrapper pour les routes nécessitant l'authentification ADMIN ou COACH.
 * 
 * @param req - La requête Next.js
 * @param requireEmailVerified - Si true, exige que l'email soit vérifié (défaut: false)
 * @returns AuthResult si l'authentification réussit, NextResponse si elle échoue
 */
export async function requireAdminOrCoach(
  req: NextRequest,
  requireEmailVerified: boolean = false
): Promise<AuthResult | NextResponse> {
  return requireAuth(req, {
    allowedRoles: [USER_ROLES.ADMIN, USER_ROLES.COACH],
    requireEmailVerified,
    authorizationErrorMessage: "Cette ressource est réservée aux administrateurs et coachs",
  });
}

/**
 * Wrapper pour les routes nécessitant l'authentification ADMIN avec email vérifié.
 * 
 * @param req - La requête Next.js
 * @returns AuthResult si l'authentification réussit, NextResponse si elle échoue
 */
export async function requireAdminWithEmailVerified(
  req: NextRequest
): Promise<AuthResult | NextResponse> {
  return requireAuth(req, {
    allowedRoles: [USER_ROLES.ADMIN],
    requireEmailVerified: true,
    authorizationErrorMessage: "Cette opération est réservée aux administrateurs",
  });
}

