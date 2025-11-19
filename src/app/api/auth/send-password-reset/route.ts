import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { sendMail } from "@/lib/mailer";
import { readFile } from "fs/promises";
import path from "path";
import { getFirebaseErrorMessage } from "@/lib/firebase-error-utils";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
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
    const redirectUrl = `${origin}/reset-password`;

    console.log("[send-password-reset] Environment variables:", {
      APP_URL: process.env.APP_URL,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NODE_ENV: process.env.NODE_ENV,
    });
    console.log("[send-password-reset] Headers:", {
      host: req.headers.get("host"),
      "x-forwarded-host": req.headers.get("x-forwarded-host"),
      "x-forwarded-proto": req.headers.get("x-forwarded-proto"),
    });
    console.log("[send-password-reset] Final origin:", origin);
    console.log("[send-password-reset] Redirect URL:", redirectUrl);

    // Générer le lien de réinitialisation via Firebase Admin vers la bonne page
    // Note: L'URL doit pointer vers un domaine autorisé dans Firebase Console
    // Authentication > Settings > Authorized domains
    // Le domaine doit être exactement: teamup--sqyping-teamup.us-east4.hosted.app
    // L'URL passée ici override l'URL configurée dans Firebase Console
    console.log(
      "[send-password-reset] Generating link with redirectUrl:",
      redirectUrl
    );
    const link = await adminAuth.generatePasswordResetLink(email, {
      url: redirectUrl,
      handleCodeInApp: false,
    });
    console.log("[send-password-reset] Generated link:", link);

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

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[send-password-reset] error", error);
    console.error(
      "[send-password-reset] error details:",
      JSON.stringify(error, null, 2)
    );
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

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
