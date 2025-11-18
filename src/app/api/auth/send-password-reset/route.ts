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

    // Déterminer l'URL de base (prod > env var > origine requête)
    const envBase = process.env.NEXT_PUBLIC_APP_URL;
    const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
    const host = req.headers.get("host") || req.headers.get("x-forwarded-host") || "localhost:3000";
    const origin = envBase || `${forwardedProto}://${host}`;
    
    // Firebase Auth nécessite que l'URL de redirection utilise un domaine autorisé
    // Utiliser le domaine de l'application (App Hosting) qui doit être dans la liste des domaines autorisés
    const redirectUrl = `${origin}/reset-password`;
    console.log("[send-password-reset] Origin:", origin);
    console.log("[send-password-reset] Redirect URL:", redirectUrl);
    console.log("[send-password-reset] Host:", host);

    // Générer le lien de réinitialisation via Firebase Admin vers la bonne page
    // Note: L'URL doit pointer vers un domaine autorisé dans Firebase Console
    // Authentication > Settings > Authorized domains
    const link = await adminAuth.generatePasswordResetLink(email, {
      url: redirectUrl,
      handleCodeInApp: false, // Désactiver handleCodeInApp pour éviter les problèmes de domaine
    });

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
    console.error("[send-password-reset] error details:", JSON.stringify(error, null, 2));
    const errorMessage = getFirebaseErrorMessage(error);
    
    // Log supplémentaire pour déboguer le problème de domaine
    if (errorMessage.includes("Domain not allowlisted") || errorMessage.includes("domain")) {
      const envBase = process.env.NEXT_PUBLIC_APP_URL;
      const host = req.headers.get("host") || req.headers.get("x-forwarded-host");
      console.error("[send-password-reset] Domain debug:", {
        envBase,
        host,
        origin: envBase || `https://${host}`,
      });
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
