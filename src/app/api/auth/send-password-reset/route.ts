import type { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { sendMail } from "@/lib/mailer";
import { readFile } from "fs/promises";
import path from "path";
import { getFirebaseErrorMessage } from "@/lib/firebase-error-utils";
import { createSecureResponse } from "@/lib/api/response-utils";
import { handleApiError, createErrorResponse } from "@/lib/api/error-handler";
import { validateEmail } from "@/lib/api/validation-helpers";
import { withRateLimit } from "@/lib/api/rate-limit-middleware";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    // Validation de l'email
    const emailError = validateEmail(email);
    if (emailError) return emailError;

    // Rate limiting par email (3 requêtes par 15 minutes)
    const rateLimitError = withRateLimit({
      key: `email:${email}`,
      maxRequests: 3,
      windowMs: 15 * 60 * 1000,
      errorMessage: "Veuillez patienter avant de renvoyer un email. Prochaine tentative possible dans quelques minutes.",
    });
    if (rateLimitError) return rateLimitError;

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
    const redirectUrl = `${origin}/reset-password`;

    // Logs uniquement en mode debug (développement)
    if (process.env.NODE_ENV === "development" && process.env.DEBUG === "true") {
      console.log("[send-password-reset] Environment variables:", {
        APP_URL: process.env.APP_URL ? "***" : undefined,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ? "***" : undefined,
        NODE_ENV: process.env.NODE_ENV,
      });
      console.log("[send-password-reset] Headers:", {
        host: req.headers.get("host"),
        "x-forwarded-host": req.headers.get("x-forwarded-host"),
        "x-forwarded-proto": req.headers.get("x-forwarded-proto"),
      });
      console.log("[send-password-reset] Final origin:", origin);
      console.log("[send-password-reset] Redirect URL:", redirectUrl);
    }

    // Générer le lien de réinitialisation via Firebase Admin
    let link: string;
    try {
      link = await adminAuth.generatePasswordResetLink(email, {
        url: redirectUrl,
        handleCodeInApp: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // Erreurs Firebase spécifiques
      if (errorMessage.includes("user-not-found") || errorMessage.includes("USER_NOT_FOUND")) {
        // Ne pas révéler si l'utilisateur existe ou non (sécurité)
        // Retourner toujours 200 pour éviter l'énumération d'emails
        return createSecureResponse({ ok: true });
      }
      
      if (errorMessage.includes("invalid-email") || errorMessage.includes("INVALID_EMAIL")) {
        return createErrorResponse(
          "Email invalide",
          400,
          "L'adresse email n'est pas valide"
        );
      }

      // Autres erreurs Firebase
      console.error("[send-password-reset] Erreur Firebase:", error);
      return createErrorResponse(
        "Erreur lors de la génération du lien",
        500,
        getFirebaseErrorMessage(error)
      );
    }

    // Log uniquement en mode debug
    if (process.env.NODE_ENV === "development" && process.env.DEBUG === "true") {
      console.log("[send-password-reset] Generated link:", link);
    }

    // Charger le template HTML et injecter le lien
    const templatePath = path.join(
      process.cwd(),
      "emails",
      "password-reset.html"
    );
    const logoPath = path.join(process.cwd(), "public", "sqyping-logo.jpg");
    const htmlTemplate = await readFile(templatePath, "utf8");
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
        subject: "Réinitialisation de votre mot de passe",
        html,
        attachments: [
          {
            filename: "sqyping-logo.jpg",
            path: logoPath,
            cid: "logo-sqyping",
            contentType: "image/jpeg",
          },
        ],
        text: `Bonjour,\n\nPour réinitialiser votre mot de passe, cliquez sur ce lien: ${link}\n\nSQY Ping TeamUp`,
      });
    } catch (error) {
      console.error("[send-password-reset] Erreur lors de l'envoi de l'email:", error);
      return createErrorResponse(
        "Erreur lors de l'envoi de l'email",
        500,
        "Impossible d'envoyer l'email de réinitialisation"
      );
    }

    // Ne pas révéler si l'utilisateur existe ou non (sécurité)
    // Toujours retourner 200 pour éviter l'énumération d'emails
    return createSecureResponse({ ok: true });
  } catch (error) {
    return handleApiError(error, {
      context: "app/api/auth/send-password-reset",
      defaultMessage: getFirebaseErrorMessage(error),
    });
  }
}
