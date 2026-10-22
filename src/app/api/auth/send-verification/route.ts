import { jsonNoStore } from "@/lib/http/cache-headers";
import { adminAuth } from "@/lib/firebase-admin";
import { buildVerificationEmail } from "@/lib/email/auth-emails";
import { getSqyPingLogoAttachment } from "@/lib/email/logo-attachment";
import { sendMail } from "@/lib/mailer";
import { getFirebaseErrorMessage } from "@/lib/firebase-error-utils";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import {
  authEmailRateLimitExceededMessage,
  checkAuthEmailRateLimit,
} from "@/lib/auth/auth-email-rate-limit";
import {
  getAuthErrorCode,
  isFirebaseUserNotFoundError,
} from "@/lib/auth/firebase-auth-errors";
import {
  buildDirectAppActionLink,
  isAuthOriginDebugEnabled,
  resolveAppOrigin,
} from "@/lib/auth/resolve-app-origin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    if (!validateOrigin(req)) {
      return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
    }

    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return jsonNoStore({ error: "Email requis" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return jsonNoStore(
        { error: "Format d'email invalide" },
        { status: 400 }
      );
    }

    const origin = resolveAppOrigin(req);
    const redirectUrl = `${origin}/auth/verify-email`;

    if (isAuthOriginDebugEnabled()) {
      console.log("[send-verification] Environment variables:", {
        APP_URL: process.env.APP_URL ? "***" : undefined,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ? "***" : undefined,
        NODE_ENV: process.env.NODE_ENV,
      });
      console.log("[send-verification] Headers:", {
        host: req.headers.get("host"),
        origin: req.headers.get("origin"),
        "x-forwarded-host": req.headers.get("x-forwarded-host"),
        "x-forwarded-proto": req.headers.get("x-forwarded-proto"),
      });
      console.log("[send-verification] Final origin:", origin);
      console.log("[send-verification] Redirect URL:", redirectUrl);
    }

    try {
      await adminAuth.getUserByEmail(email);
    } catch (error) {
      if (isFirebaseUserNotFoundError(error)) {
        return jsonNoStore({ ok: true });
      }
      console.error("[send-verification] Erreur lookup utilisateur:", error);
      return jsonNoStore(
        { error: "Erreur serveur", message: "Impossible de traiter la demande" },
        { status: 500 }
      );
    }

    const rateLimitResult = checkAuthEmailRateLimit("verification", email);
    if (!rateLimitResult.allowed) {
      return jsonNoStore(
        {
          error: "Trop de requêtes",
          message: authEmailRateLimitExceededMessage(rateLimitResult.resetAt),
        },
        { status: 429 }
      );
    }

    let link: string;
    try {
      link = buildDirectAppActionLink(
        await adminAuth.generateEmailVerificationLink(email, {
          url: redirectUrl,
          handleCodeInApp: false,
        }),
        origin,
        "/auth/verify-email"
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const authCode = getAuthErrorCode(error);

      if (isFirebaseUserNotFoundError(error)) {
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

      console.error("[send-verification] Erreur Firebase:", error, {
        redirectUrl,
        origin,
        authCode,
      });
      return jsonNoStore(
        { error: "Erreur lors de la génération du lien", message: getFirebaseErrorMessage(error) },
        { status: 500 }
      );
    }

    if (isAuthOriginDebugEnabled()) {
      console.log("[send-verification] Generated link:", link);
    }

    const { html, text } = buildVerificationEmail({
      actionUrl: link,
      appOrigin: origin,
    });

    try {
      await sendMail({
        to: email,
        subject: "Vérification de votre adresse e-mail",
        html,
        text,
        attachments: [getSqyPingLogoAttachment()],
      });
    } catch (error) {
      console.error("[send-verification] Erreur lors de l'envoi de l'email:", error);
      return jsonNoStore(
        { error: "Erreur lors de l'envoi de l'email", message: "Impossible d'envoyer l'email de vérification" },
        { status: 500 }
      );
    }

    return jsonNoStore({ ok: true });
  } catch (error) {
    console.error("[send-verification] error", error);

    const errorMessage = getFirebaseErrorMessage(error);
    const errorString = error instanceof Error ? error.message : String(error);

    let statusCode = 500;
    if (errorString.includes("user-not-found") || errorString.includes("USER_NOT_FOUND")) {
      return jsonNoStore({ ok: true });
    } else if (errorString.includes("invalid-email") || errorString.includes("INVALID_EMAIL")) {
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
