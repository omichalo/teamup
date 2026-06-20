import { jsonNoStore } from "@/lib/http/cache-headers";
import { adminAuth } from "@/lib/firebase-admin";
import { buildPasswordResetEmail } from "@/lib/email/auth-emails";
import { getSqyPingLogoAttachment } from "@/lib/email/logo-attachment";
import { sendMail } from "@/lib/mailer";
import { getFirebaseErrorMessage } from "@/lib/firebase-error-utils";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import {
  buildDirectAppActionLink,
  isAuthOriginDebugEnabled,
  resolveAppOrigin,
} from "@/lib/auth/resolve-app-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAuthErrorCode(error: unknown): string {
  if (typeof error !== "object" || error === null) {
    return "";
  }

  const maybeCode = (error as { code?: unknown }).code;
  return typeof maybeCode === "string" ? maybeCode : "";
}

export async function POST(req: Request) {
  try {
    if (!validateOrigin(req)) {
      return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
    }

    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return jsonNoStore({ error: "Email requis" }, { status: 400 });
    }

    // Validation du format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return jsonNoStore(
        { error: "Format d'email invalide" },
        { status: 400 }
      );
    }

    // Rate limiting par email (3 requêtes par 15 minutes)
    const rateLimitResult = checkRateLimit(`email:${email}`, 3, 15 * 60 * 1000);
    if (!rateLimitResult.allowed) {
      return jsonNoStore(
        {
          error: "Trop de requêtes",
          message: `Veuillez patienter avant de renvoyer un email. Prochaine tentative possible dans ${Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000 / 60)} minutes.`,
        },
        { status: 429 }
      );
    }

    const origin = resolveAppOrigin(req);
    const redirectUrl = `${origin}/reset-password`;

    if (isAuthOriginDebugEnabled()) {
      console.log("[send-password-reset] Environment variables:", {
        APP_URL: process.env.APP_URL ? "***" : undefined,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ? "***" : undefined,
        NODE_ENV: process.env.NODE_ENV,
      });
      console.log("[send-password-reset] Headers:", {
        host: req.headers.get("host"),
        origin: req.headers.get("origin"),
        "x-forwarded-host": req.headers.get("x-forwarded-host"),
        "x-forwarded-proto": req.headers.get("x-forwarded-proto"),
      });
      console.log("[send-password-reset] Final origin:", origin);
      console.log("[send-password-reset] Redirect URL:", redirectUrl);
    }

    // Générer le lien de réinitialisation via Firebase Admin
    let link: string;
    try {
      link = buildDirectAppActionLink(
        await adminAuth.generatePasswordResetLink(email, {
          url: redirectUrl,
          handleCodeInApp: false,
        }),
        origin,
        "/reset-password"
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const authCode = getAuthErrorCode(error);
      
      // Erreurs Firebase spécifiques
      if (
        authCode === "auth/user-not-found" ||
        errorMessage.includes("user-not-found") ||
        errorMessage.includes("USER_NOT_FOUND") ||
        errorMessage.includes("no user record")
      ) {
        // Ne pas révéler si l'utilisateur existe ou non (sécurité)
        // Retourner toujours 200 pour éviter l'énumération d'emails
        return jsonNoStore({ ok: true });
      }
      
      if (
        authCode === "auth/invalid-email" ||
        errorMessage.includes("invalid-email") ||
        errorMessage.includes("INVALID_EMAIL")
      ) {
        return jsonNoStore(
          { error: "Email invalide", message: "L'adresse email n'est pas valide" },
          { status: 400 }
        );
      }

      // Autres erreurs Firebase
      console.error("[send-password-reset] Erreur Firebase:", error);
      return jsonNoStore(
        { error: "Erreur lors de la génération du lien", message: getFirebaseErrorMessage(error) },
        { status: 500 }
      );
    }

    // Log uniquement en mode debug
    if (process.env.NODE_ENV === "development" && process.env.DEBUG === "true") {
      console.log("[send-password-reset] Generated link:", link);
    }

    const { html, text } = buildPasswordResetEmail({
      actionUrl: link,
      appOrigin: origin,
    });

    // Envoyer l'email
    try {
      await sendMail({
        to: email,
        subject: "Réinitialisation de votre mot de passe",
        html,
        text,
        attachments: [getSqyPingLogoAttachment()],
      });
    } catch (error) {
      console.error("[send-password-reset] Erreur lors de l'envoi de l'email:", error);
      return jsonNoStore(
        { error: "Erreur lors de l'envoi de l'email", message: "Impossible d'envoyer l'email de réinitialisation" },
        { status: 500 }
      );
    }

    // Ne pas révéler si l'utilisateur existe ou non (sécurité)
    // Toujours retourner 200 pour éviter l'énumération d'emails
    return jsonNoStore({ ok: true });
  } catch (error) {
    // Logger l'erreur complète côté serveur pour le débogage
    console.error("[send-password-reset] error", error);
    if (error instanceof Error) {
      console.error("[send-password-reset] error message:", error.message);
      console.error("[send-password-reset] error stack:", error.stack);
    }
    console.error(
      "[send-password-reset] error details:",
      JSON.stringify(error, null, 2)
    );

    // Retourner un message filtré au client
    const errorMessage = getFirebaseErrorMessage(error);

    // Log supplémentaire pour déboguer le problème de domaine
    if (
      errorMessage.includes("Domain not allowlisted") ||
      errorMessage.includes("domain")
    ) {
      const envBase = process.env.NEXT_PUBLIC_APP_URL;
      const host =
        req.headers.get("host") || req.headers.get("x-forwarded-host");
      console.error("[send-password-reset] Domain debug:", {
        envBase,
        host,
        origin: envBase || `https://${host}`,
      });
    }

    // Déterminer le code HTTP approprié
    let statusCode = 500;
    const errorString = error instanceof Error ? error.message : String(error);
    
    if (errorString.includes("invalid-email") || errorString.includes("INVALID_EMAIL")) {
      statusCode = 400;
    } else if (errorString.includes("too-many-requests") || errorString.includes("TOO_MANY_REQUESTS")) {
      statusCode = 429;
    }

    return jsonNoStore(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
