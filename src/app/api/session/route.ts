import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";
import { createSecureResponse } from "@/lib/api/response-utils";
import { handleApiError, createErrorResponse } from "@/lib/api/error-handler";
import { validateString } from "@/lib/api/validation-helpers";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { idToken } = body;

    const validatedToken = validateString(idToken, "idToken");
    if (validatedToken instanceof Response) return validatedToken;

    // Vérification du token avec gestion d'erreurs explicite
    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(validatedToken, true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // Token expiré
      if (errorMessage.includes("expired") || errorMessage.includes("Expired")) {
        return createErrorResponse(
          "Token expired",
          401,
          "Le token d'authentification a expiré"
        );
      }
      
      // Token invalide ou mal formé
      if (
        errorMessage.includes("invalid") ||
        errorMessage.includes("Invalid") ||
        errorMessage.includes("malformed")
      ) {
        return createErrorResponse(
          "Invalid token",
          401,
          "Le token d'authentification est invalide"
        );
      }

      // Autres erreurs de vérification
      console.error("[session] Erreur lors de la vérification du token:", error);
      return createErrorResponse(
        "Token verification failed",
        401,
        "Échec de la vérification du token"
      );
    }

    if (!decoded.email_verified) {
      return createErrorResponse(
        "Email non vérifié",
        403,
        "L'email associé au compte n'est pas vérifié"
      );
    }

    // Création du cookie de session avec gestion d'erreurs
    let sessionCookie;
    try {
      const expiresIn = 14 * 24 * 60 * 60 * 1000; // 14 jours
      sessionCookie = await adminAuth.createSessionCookie(idToken, {
        expiresIn,
      });
    } catch (error) {
      console.error("[session] Erreur lors de la création du cookie de session:", error);
      return createErrorResponse(
        "Session creation failed",
        500,
        "Impossible de créer la session"
      );
    }

    const res = createSecureResponse({ ok: true });
    // Normaliser les paramètres du cookie : Secure et SameSite=Strict en production
    const isProduction = process.env.NODE_ENV === "production";
    res.cookies.set({
      name: "__session",
      value: sessionCookie,
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "strict" : "lax",
      path: "/",
      maxAge: Math.floor((14 * 24 * 60 * 60 * 1000) / 1000),
    });
    return res;
  } catch (error) {
    return handleApiError(error, {
      context: "app/api/session",
      defaultMessage: "Une erreur inattendue s'est produite lors de la création de la session",
    });
  }
}

export async function DELETE() {
  try {
    // Récupérer le cookie de session avant de le supprimer
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;
    let uid: string | null = null;

    if (sessionCookie) {
      try {
        // Vérifier le cookie pour obtenir l'UID avant de le révoquer
        const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
        uid = decoded.uid;
      } catch (error) {
        // Le cookie est invalide ou expiré, on continue quand même la suppression
        console.warn("[session] Cookie invalide lors de la déconnexion:", error);
      }
    }

    // Révoquer les refresh tokens si on a un UID valide
    if (uid) {
      try {
        await adminAuth.revokeRefreshTokens(uid);
        console.log(`[session] Refresh tokens révoqués pour l'utilisateur ${uid}`);
      } catch (error) {
        // Log l'erreur mais continue la suppression du cookie
        console.error("[session] Erreur lors de la révocation des tokens:", error);
      }
    }

    // Supprimer le cookie côté client avec les mêmes paramètres que la création
    const isProduction = process.env.NODE_ENV === "production";
    const res = createSecureResponse({ ok: true });
    res.cookies.set({
      name: "__session",
      value: "",
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "strict" : "lax",
      path: "/",
      maxAge: 0,
    });
    return res;
  } catch (error) {
    console.error("[session] Erreur lors de la déconnexion:", error);
    // Même en cas d'erreur, on supprime le cookie côté client avec les mêmes paramètres
    const isProduction = process.env.NODE_ENV === "production";
    const res = createSecureResponse({ ok: true });
    res.cookies.set({
      name: "__session",
      value: "",
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "strict" : "lax",
      path: "/",
      maxAge: 0,
    });
    return res;
  }
}

