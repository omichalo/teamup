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
    
    console.log("[send-verification] Origin:", origin);

    // Générer le lien de vérification via Firebase Admin avec actionCodeSettings explicites
    const link = await adminAuth.generateEmailVerificationLink(email, {
      url: `${origin}/auth/verify-email`,
      handleCodeInApp: true,
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
