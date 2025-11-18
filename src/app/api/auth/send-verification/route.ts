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
    // Priorité: NEXT_PUBLIC_APP_URL > headers > localhost
    const envBase = process.env.NEXT_PUBLIC_APP_URL;
    const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
    const host = req.headers.get("host") || req.headers.get("x-forwarded-host");
    
    let origin: string;
    
    // Forcer l'utilisation de NEXT_PUBLIC_APP_URL si elle est définie
    if (envBase && envBase.trim() !== "") {
      origin = envBase.trim().replace(/\/$/, ""); // Nettoyer les espaces et trailing slash
    } else if (host) {
      // Utiliser les headers si disponibles
      const proto = host.includes("localhost") ? "http" : forwardedProto;
      origin = `${proto}://${host}`;
    } else {
      // Fallback localhost uniquement en développement
      origin = "http://localhost:3000";
    }
    
    // S'assurer que l'URL est bien formatée
    const redirectUrl = `${origin}/auth/verify-email`;
    
    console.log("[send-verification] Environment variables:", {
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NODE_ENV: process.env.NODE_ENV,
    });
    console.log("[send-verification] Headers:", {
      host: req.headers.get("host"),
      "x-forwarded-host": req.headers.get("x-forwarded-host"),
      "x-forwarded-proto": req.headers.get("x-forwarded-proto"),
    });
    console.log("[send-verification] Final origin:", origin);
    console.log("[send-verification] Redirect URL:", redirectUrl);

    // Générer le lien de vérification via Firebase Admin avec actionCodeSettings explicites
    const link = await adminAuth.generateEmailVerificationLink(email, {
      url: redirectUrl,
      handleCodeInApp: false,
    });

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

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[send-verification] error", error);
    const errorMessage = getFirebaseErrorMessage(error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
