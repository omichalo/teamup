import { SQYPING_EMAIL_APP_NAME } from "@/lib/email/brand";
import { escapeHtml } from "@/lib/email/escape-html";
import {
  buildSqyPingEmailLayout,
  emailMutedParagraph,
  emailParagraph,
} from "@/lib/email/layout";
import { buildMesInscriptionsUrl } from "@/lib/club-registration/mes-inscriptions-url";

export type RegistrationAccountLinkedEmailOptions = {
  adherentName: string;
  registrationId: string;
  appOrigin: string;
};

/** E-mail informatif après association du dossier à un compte TeamUp. */
export function buildRegistrationAccountLinkedEmail(
  options: RegistrationAccountLinkedEmailOptions
): { subject: string; html: string; text: string } {
  const adherentName = options.adherentName.trim() || "adhérent";
  const mesInscriptionsUrl = buildMesInscriptionsUrl(
    options.appOrigin,
    options.registrationId
  );
  const safeName = escapeHtml(adherentName);

  const subject = `Votre dossier d'adhésion est associé à votre compte — ${adherentName}`;

  const bodyHtml = [
    emailParagraph("Bonjour,"),
    emailParagraph(
      `Le dossier d'adhésion de <strong>${safeName}</strong> est désormais accessible depuis votre compte <strong>${SQYPING_EMAIL_APP_NAME}</strong>.`
    ),
    emailParagraph(
      "Vous pouvez consulter le dossier, les factures et régler en ligne depuis Mes dossiers."
    ),
    emailMutedParagraph(
      `Référence dossier : ${escapeHtml(options.registrationId)}.`
    ),
  ].join("");

  const html = buildSqyPingEmailLayout({
    title: "Dossier associé à votre compte",
    preheader: `Dossier ${adherentName} associé à votre compte`,
    bodyHtml,
    appOrigin: options.appOrigin,
    primaryAction: {
      label: "Ouvrir Mes dossiers",
      url: mesInscriptionsUrl,
    },
    fallbackLink: mesInscriptionsUrl,
  });

  const text = [
    "Bonjour,",
    "",
    `Le dossier d'adhésion de ${adherentName} est désormais accessible depuis votre compte ${SQYPING_EMAIL_APP_NAME}.`,
    "Vous pouvez consulter le dossier, les factures et régler en ligne depuis Mes dossiers.",
    "",
    `Mes dossiers : ${mesInscriptionsUrl}`,
    "",
    `Référence dossier : ${options.registrationId}`,
    "",
    SQYPING_EMAIL_APP_NAME,
  ].join("\n");

  return { subject, html, text };
}
