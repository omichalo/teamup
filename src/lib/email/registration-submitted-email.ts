import { SQYPING_EMAIL_APP_NAME } from "@/lib/email/brand";
import { escapeHtml } from "@/lib/email/escape-html";
import {
  buildSqyPingEmailLayout,
  emailMutedParagraph,
  emailParagraph,
} from "@/lib/email/layout";

export type RegistrationSubmittedEmailContent = {
  adherentName: string;
  registrationId: string;
  appOrigin: string;
};

export function buildRegistrationSubmittedEmail(
  options: RegistrationSubmittedEmailContent
): { html: string; text: string } {
  const { adherentName, registrationId, appOrigin } = options;
  const safeName = escapeHtml(adherentName);
  const mesInscriptionsUrl = `${appOrigin.replace(/\/$/, "")}/club/mes-inscriptions?created=${encodeURIComponent(registrationId)}`;

  const bodyHtml = [
    emailParagraph("Bonjour,"),
    emailParagraph(
      `Nous avons bien reçu votre demande d'adhésion pour <strong>${safeName}</strong> sur <strong>${SQYPING_EMAIL_APP_NAME}</strong>.`
    ),
    emailParagraph(
      "Le secrétariat du club va relire votre dossier (tarif, pièces, mode de paiement choisi). Vous serez informé(e) des prochaines étapes depuis votre espace en ligne ou par e-mail si une action est requise."
    ),
    emailMutedParagraph(
      "Conservez cet e-mail : il contient le lien vers le suivi de votre dossier."
    ),
  ].join("");

  const html = buildSqyPingEmailLayout({
    title: "Demande d'adhésion reçue",
    preheader: `Votre dossier d'adhésion pour ${adherentName} a bien été transmis au club.`,
    bodyHtml,
    appOrigin,
    primaryAction: {
      label: "Suivre mon dossier",
      url: mesInscriptionsUrl,
    },
    fallbackLink: mesInscriptionsUrl,
  });

  const text = [
    "Bonjour,",
    "",
    `Nous avons bien reçu votre demande d'adhésion pour ${adherentName} sur ${SQYPING_EMAIL_APP_NAME}.`,
    "Le secrétariat va relire votre dossier et vous informera des prochaines étapes.",
    "",
    `Suivre mon dossier : ${mesInscriptionsUrl}`,
    "",
    SQYPING_EMAIL_APP_NAME,
  ].join("\n");

  return { html, text };
}
