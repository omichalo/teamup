import { SQYPING_COLORS } from "@/lib/email/brand";
import { escapeHtml } from "@/lib/email/escape-html";
import {
  buildSqyPingEmailLayout,
  emailMutedParagraph,
  emailParagraph,
  emailSecretariatContactHtml,
  emailSecretariatContactText,
} from "@/lib/email/layout";
import { formatEurosForEmail } from "@/lib/email/payment-email";

export type PaymentConfirmedSource = "stripe" | "secretariat";

export type PaymentConfirmedEmailContent = {
  adherentName: string;
  amountCents: number;
  registrationId: string;
  appOrigin: string;
  source: PaymentConfirmedSource;
  invoiceAvailable?: boolean;
};

export function buildPaymentConfirmedEmail(
  options: PaymentConfirmedEmailContent
): { html: string; text: string } {
  const {
    adherentName,
    amountCents,
    registrationId,
    appOrigin,
    source,
    invoiceAvailable = false,
  } = options;

  const safeName = escapeHtml(adherentName);
  const formattedAmount = formatEurosForEmail(amountCents);
  const mesInscriptionsUrl = `${appOrigin.replace(/\/$/, "")}/club/mes-inscriptions?registration=${encodeURIComponent(registrationId)}&payment=success`;

  const sourceLine =
    source === "stripe"
      ? "Votre règlement en ligne via Stripe a bien été pris en compte."
      : "Le secrétariat du club a enregistré la réception de votre règlement.";

  const invoiceLine = invoiceAvailable
    ? emailParagraph(
        `Votre <strong>facture</strong> est disponible depuis votre espace adhérent (<em>Télécharger la facture</em> sur le dossier concerné).`
      )
    : "";

  const bodyHtml = [
    emailParagraph("Bonjour,"),
    emailParagraph(
      `${sourceLine} Le paiement de <strong style="color: ${SQYPING_COLORS.primary.main};">${escapeHtml(formattedAmount)}</strong> pour l'adhésion de <strong>${safeName}</strong> est désormais enregistré.`
    ),
    emailParagraph(
      "Votre dossier est à jour côté règlement. Le secrétariat pourra encore finaliser les formalités administratives restantes le cas échéant (licence, certificat médical, etc.)."
    ),
    invoiceLine,
    emailMutedParagraph(
      "Conservez cet e-mail comme justificatif de la confirmation de paiement côté club."
    ),
  ]
    .filter(Boolean)
    .join("");

  const html = buildSqyPingEmailLayout({
    title: "Paiement enregistré",
    preheader: `Paiement de ${formattedAmount} confirmé pour ${adherentName}.`,
    bodyHtml,
    appOrigin,
    primaryAction: {
      label: "Voir mon dossier",
      url: mesInscriptionsUrl,
    },
    fallbackLink: mesInscriptionsUrl,
    noticeHtml: `
      <p style="margin: 0; font-size: 14px; line-height: 1.6;">
        <strong>Adhésion SQY Ping</strong> — merci pour votre confiance. ${emailSecretariatContactHtml()}
      </p>
    `,
    noticeVariant: "info",
  });

  const text = [
    "Bonjour,",
    "",
    sourceLine,
    `Montant enregistré : ${formattedAmount} pour ${adherentName}.`,
    "Votre dossier est à jour côté règlement.",
    ...(invoiceAvailable
      ? ["", "Votre facture est disponible depuis votre espace adhérent."]
      : []),
    "",
    `Voir mon dossier : ${mesInscriptionsUrl}`,
    "",
    emailSecretariatContactText(),
    "",
    "SQY Ping",
  ].join("\n");

  return { html, text };
}
