import { SQYPING_EMAIL_APP_NAME } from "@/lib/email/brand";
import {
  buildSqyPingEmailLayout,
  emailMutedParagraph,
  emailParagraph,
} from "@/lib/email/layout";

export type VerificationEmailContent = {
  actionUrl: string;
  appOrigin: string;
};

export function buildVerificationEmail(
  options: VerificationEmailContent
): { html: string; text: string } {
  const { actionUrl, appOrigin } = options;

  const bodyHtml = [
    emailParagraph("Bonjour,"),
    emailParagraph(
      `Merci de vous être inscrit sur <strong>${SQYPING_EMAIL_APP_NAME}</strong>. Pour finaliser votre inscription et accéder à toutes les fonctionnalités, veuillez vérifier votre adresse e-mail.`
    ),
    emailMutedParagraph(
      "<strong>Important :</strong> ce lien est valable 24&nbsp;heures. Si vous n'avez pas demandé cette vérification, ignorez cet e-mail."
    ),
  ].join("");

  const html = buildSqyPingEmailLayout({
    title: "Vérification de votre adresse e-mail",
    preheader: "Confirmez votre adresse e-mail pour activer votre compte SQY Ping.",
    bodyHtml,
    appOrigin,
    primaryAction: {
      label: "Vérifier mon adresse e-mail",
      url: actionUrl,
    },
    fallbackLink: actionUrl,
  });

  const text = [
    "Bonjour,",
    "",
    `Merci de vous être inscrit sur ${SQYPING_EMAIL_APP_NAME}.`,
    "Pour finaliser votre inscription, vérifiez votre adresse e-mail via le lien ci-dessous :",
    "",
    actionUrl,
    "",
    "Ce lien est valable 24 heures.",
    "",
    SQYPING_EMAIL_APP_NAME,
  ].join("\n");

  return { html, text };
}

export type PasswordResetEmailContent = {
  actionUrl: string;
  appOrigin: string;
};

export function buildPasswordResetEmail(
  options: PasswordResetEmailContent
): { html: string; text: string } {
  const { actionUrl, appOrigin } = options;

  const bodyHtml = [
    emailParagraph("Bonjour,"),
    emailParagraph(
      `Vous avez demandé à réinitialiser votre mot de passe pour <strong>${SQYPING_EMAIL_APP_NAME}</strong>. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.`
    ),
    emailMutedParagraph(
      "Si vous n'avez pas demandé cette réinitialisation, ignorez cet e-mail — votre mot de passe actuel restera inchangé."
    ),
  ].join("");

  const noticeHtml = `
    <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; line-height: 1.6;">À savoir</p>
    <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
      <li>Ce lien est valable <strong>1 heure</strong> uniquement.</li>
      <li>Ne partagez pas ce lien : il donne accès à la modification de votre mot de passe.</li>
      <li>En cas de difficulté, contactez le secrétariat du club.</li>
    </ul>
  `;

  const html = buildSqyPingEmailLayout({
    title: "Réinitialisation de votre mot de passe",
    preheader: "Réinitialisez votre mot de passe SQY Ping en toute sécurité.",
    bodyHtml,
    appOrigin,
    primaryAction: {
      label: "Réinitialiser mon mot de passe",
      url: actionUrl,
    },
    fallbackLink: actionUrl,
    noticeHtml,
    noticeVariant: "warning",
  });

  const text = [
    "Bonjour,",
    "",
    `Vous avez demandé à réinitialiser votre mot de passe pour ${SQYPING_EMAIL_APP_NAME}.`,
    "Cliquez sur le lien ci-dessous (valable 1 heure) :",
    "",
    actionUrl,
    "",
    "Si vous n'avez pas demandé cette réinitialisation, ignorez cet e-mail.",
    "",
    SQYPING_EMAIL_APP_NAME,
  ].join("\n");

  return { html, text };
}
