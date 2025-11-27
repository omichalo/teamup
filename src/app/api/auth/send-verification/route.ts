import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { sendMail } from "@/lib/mailer";
import { readFile } from "fs/promises";
import path from "path";
import { getFirebaseErrorMessage } from "@/lib/firebase-error-utils";
import { checkRateLimit } from "@/lib/auth/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    // Validation du format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Format d'email invalide" },
        { status: 400 }
      );
    }

    // Rate limiting par email (3 requêtes par 15 minutes)
    const rateLimitResult = checkRateLimit(`email:${email}`, 3, 15 * 60 * 1000);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Trop de requêtes",
          message: `Veuillez patienter avant de renvoyer un email. Prochaine tentative possible dans ${Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000 / 60)} minutes.`,
        },
        { status: 429 }
      );
    }

    // Déterminer l'URL de base
    // Priorité: APP_URL (serveur) > NEXT_PUBLIC_APP_URL > headers > localhost
    const appUrl = process.env.APP_URL; // Variable serveur (sans NEXT_PUBLIC_)
    const envBase = process.env.NEXT_PUBLIC_APP_URL; // Variable client (peut ne pas être disponible au runtime serveur)
    const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
    const host = req.headers.get("host") || req.headers.get("x-forwarded-host");
    
    let origin: string;
    
    // Priorité 1: APP_URL (variable serveur, toujours disponible au runtime)
    if (appUrl && appUrl.trim() !== "") {
      origin = appUrl.trim().replace(/\/$/, "");
    }
    // Priorité 2: NEXT_PUBLIC_APP_URL (peut ne pas être disponible au runtime serveur)
    else if (envBase && envBase.trim() !== "") {
      origin = envBase.trim().replace(/\/$/, "");
    }
    // Priorité 3: Headers de la requête
    else if (host) {
      const proto = host.includes("localhost") ? "http" : forwardedProto;
      origin = `${proto}://${host}`;
    }
    // Priorité 4: Fallback localhost uniquement en développement
    else {
      origin = "http://localhost:3000";
    }
    
    // S'assurer que l'URL est bien formatée
    const redirectUrl = `${origin}/auth/verify-email`;

    // Logs uniquement en mode debug
    if (process.env.NODE_ENV === "development" && process.env.DEBUG === "true") {
      console.log("[send-verification] Environment variables:", {
        APP_URL: process.env.APP_URL ? "***" : undefined,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ? "***" : undefined,
        NODE_ENV: process.env.NODE_ENV,
      });
      console.log("[send-verification] Headers:", {
        host: req.headers.get("host"),
        "x-forwarded-host": req.headers.get("x-forwarded-host"),
        "x-forwarded-proto": req.headers.get("x-forwarded-proto"),
      });
      console.log("[send-verification] Final origin:", origin);
      console.log("[send-verification] Redirect URL:", redirectUrl);
    }

    // Générer le lien de vérification via Firebase Admin
    let link: string;
    try {
      link = await adminAuth.generateEmailVerificationLink(email, {
        url: redirectUrl,
        handleCodeInApp: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // Erreurs Firebase spécifiques
      if (errorMessage.includes("user-not-found") || errorMessage.includes("USER_NOT_FOUND")) {
        return NextResponse.json(
          { error: "Utilisateur non trouvé", message: "Aucun compte n'est associé à cet email" },
          { status: 404 }
        );
      }
      
      if (errorMessage.includes("invalid-email") || errorMessage.includes("INVALID_EMAIL")) {
        return NextResponse.json(
          { error: "Email invalide", message: "L'adresse email n'est pas valide" },
          { status: 400 }
        );
      }

      // Autres erreurs Firebase
      console.error("[send-verification] Erreur Firebase:", error);
      return NextResponse.json(
        { error: "Erreur lors de la génération du lien", message: getFirebaseErrorMessage(error) },
        { status: 500 }
      );
    }

    // Log uniquement en mode debug
    if (process.env.NODE_ENV === "development" && process.env.DEBUG === "true") {
      console.log("[send-verification] Generated link:", link);
    }

    // Charger le template HTML et injecter le lien
    const templatePath = path.join(
      process.cwd(),
      "emails",
      "email-verification.html"
    );
    const logoPath = path.join(process.cwd(), "public", "sqyping-logo.jpg");
    const htmlTemplate = await readFile(templatePath, "utf8");
    // Remplacer le lien d'action et injecter le CID du logo
    const html = htmlTemplate
      .replace(/{{actionUrl}}/g, link)
      .replace(
        /https:\/\/sqyping-live-scoring\.web\.app\/sqyping-logo\.jpg/g,
        "cid:logo-sqyping"
      )
      .replace(/\/sqyping-logo\.jpg/g, "cid:logo-sqyping");

    // Envoyer l'email
    try {
      await sendMail({
        to: email,
        subject: "Vérification de votre adresse email",
        html,
        attachments: [
          {
            filename: "sqyping-logo.jpg",
            path: logoPath,
            cid: "logo-sqyping",
            contentType: "image/jpeg",
          },
        ],
        text: `Bonjour,\n\nMerci de vérifier votre adresse email en cliquant sur ce lien: ${link}\n\nSQY Ping TeamUp`,
      });
    } catch (error) {
      console.error("[send-verification] Erreur lors de l'envoi de l'email:", error);
      return NextResponse.json(
        { error: "Erreur lors de l'envoi de l'email", message: "Impossible d'envoyer l'email de vérification" },
        { status: 500 }
      );
    }

    const res = NextResponse.json({ ok: true });
    // Ajouter Cache-Control pour éviter la mise en cache
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    return res;
  } catch (error) {
    // Logger l'erreur complète côté serveur pour le débogage
    console.error("[send-verification] error", error);
    
    // Retourner un message filtré au client avec le bon code HTTP
    const errorMessage = getFirebaseErrorMessage(error);
    const errorString = error instanceof Error ? error.message : String(error);
    
    // Déterminer le code HTTP approprié
    let statusCode = 500;
    if (errorString.includes("user-not-found") || errorString.includes("USER_NOT_FOUND")) {
      statusCode = 404;
    } else if (errorString.includes("invalid-email") || errorString.includes("INVALID_EMAIL")) {
      statusCode = 400;
    } else if (errorString.includes("too-many-requests") || errorString.includes("TOO_MANY_REQUESTS")) {
      statusCode = 429;
    }

    const res = NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return res;
  }
}
