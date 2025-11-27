import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { idToken } = body;

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json(
        { error: "Missing token", message: "Le token d'authentification est requis" },
        { status: 400 }
      );
    }

    // Vérification du token avec gestion d'erreurs explicite
    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(idToken, true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // Token expiré
      if (errorMessage.includes("expired") || errorMessage.includes("Expired")) {
        return NextResponse.json(
          { error: "Token expired", message: "Le token d'authentification a expiré" },
          { status: 401 }
        );
      }
      
      // Token invalide ou mal formé
      if (
        errorMessage.includes("invalid") ||
        errorMessage.includes("Invalid") ||
        errorMessage.includes("malformed")
      ) {
        return NextResponse.json(
          { error: "Invalid token", message: "Le token d'authentification est invalide" },
          { status: 401 }
        );
      }

      // Autres erreurs de vérification
      console.error("[session] Erreur lors de la vérification du token:", error);
      return NextResponse.json(
        { error: "Token verification failed", message: "Échec de la vérification du token" },
        { status: 401 }
      );
    }

    if (!decoded.email_verified) {
      return NextResponse.json(
        { error: "Email non vérifié", message: "L'email associé au compte n'est pas vérifié" },
        { status: 403 }
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
      return NextResponse.json(
        { error: "Session creation failed", message: "Impossible de créer la session" },
        { status: 500 }
      );
    }

    const res = NextResponse.json({ ok: true });
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
    // Ajouter Cache-Control pour éviter la mise en cache
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    return res;
  } catch (error) {
    console.error("[session] Erreur inattendue lors de la création de session:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Une erreur inattendue s'est produite lors de la création de la session",
      },
      { status: 500 }
    );
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
    const res = NextResponse.json({ ok: true });
    res.cookies.set({
      name: "__session",
      value: "",
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "strict" : "lax",
      path: "/",
      maxAge: 0,
    });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    return res;
  } catch (error) {
    console.error("[session] Erreur lors de la déconnexion:", error);
    // Même en cas d'erreur, on supprime le cookie côté client avec les mêmes paramètres
    const isProduction = process.env.NODE_ENV === "production";
    const res = NextResponse.json({ ok: true });
    res.cookies.set({
      name: "__session",
      value: "",
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "strict" : "lax",
      path: "/",
      maxAge: 0,
    });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    return res;
  }
}

