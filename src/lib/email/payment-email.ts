import { SQYPING_COLORS, SQYPING_EMAIL_APP_NAME } from "@/lib/email/brand";
import { escapeHtml } from "@/lib/email/escape-html";
import {
  buildSqyPingEmailLayout,
  emailMutedParagraph,
  emailParagraph,
  emailSectionTitle,
} from "@/lib/email/layout";
import {
  BNPL_PAYMENT_REQUEST_NOTICE,
  BNPL_PAYMENT_REQUEST_PARAGRAPH,
  BNPL_PAYMENT_REQUEST_TEXT_LINE,
} from "@/lib/club-registration/payment/bnpl-checkout-copy";
import type { PriceQuote } from "@/lib/pricing/types";

export function formatEurosForEmail(amountCents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amountCents / 100);
}

export function formatQuoteBreakdownText(quote: PriceQuote): string {
  const lines = quote.lines
    .filter((line) => line.kind !== "info" && line.amountCents !== 0)
    .map((line) => `  - ${line.label} : ${formatEurosForEmail(line.amountCents)}`);

  return [...lines, `  Total : ${formatEurosForEmail(quote.totalCents)}`].join("\n");
}

export function formatQuoteBreakdownHtmlForEmail(quote: PriceQuote): string {
  const rows = quote.lines
    .filter((line) => line.kind !== "info" && line.amountCents !== 0)
    .map(
      (line) => `
        <tr>
          <td style="padding: 10px 12px; font-size: 15px; color: ${SQYPING_COLORS.text.primary}; border-bottom: 1px solid ${SQYPING_COLORS.surface.divider};">
            ${escapeHtml(line.label)}
          </td>
          <td align="right" style="padding: 10px 12px; font-size: 15px; font-weight: 600; color: ${SQYPING_COLORS.text.primary}; border-bottom: 1px solid ${SQYPING_COLORS.surface.divider}; white-space: nowrap;">
            ${escapeHtml(formatEurosForEmail(line.amountCents))}
          </td>
        </tr>
      `
    )
    .join("");

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 8px 0; border: 1px solid ${SQYPING_COLORS.surface.divider}; border-radius: 12px; overflow: hidden;">
      ${rows}
      <tr style="background-color: rgba(40, 48, 109, 0.04);">
        <td style="padding: 12px; font-size: 15px; font-weight: 700; color: ${SQYPING_COLORS.primary.main};">
          Total à régler
        </td>
        <td align="right" style="padding: 12px; font-size: 16px; font-weight: 700; color: ${SQYPING_COLORS.primary.main}; white-space: nowrap;">
          ${escapeHtml(formatEurosForEmail(quote.totalCents))}
        </td>
      </tr>
    </table>
  `;
}

export type PaymentRequestEmailContent = {
  adherentName: string;
  amountCents: number;
  checkoutUrl: string;
  appOrigin: string;
  quote?: PriceQuote | null;
};

export function buildPaymentRequestEmail(
  options: PaymentRequestEmailContent
): { html: string; text: string } {
  const { adherentName, amountCents, checkoutUrl, appOrigin, quote } = options;
  const safeName = escapeHtml(adherentName);
  const formattedAmount = formatEurosForEmail(amountCents);
  const hasDetailedQuote = Boolean(quote && quote.lines.length > 0);

  const breakdownBlock = hasDetailedQuote
    ? `${emailSectionTitle("Détail de votre adhésion")}${formatQuoteBreakdownHtmlForEmail(quote!)}`
    : emailParagraph(
        `Montant à régler : <strong style="color: ${SQYPING_COLORS.primary.main};">${escapeHtml(formattedAmount)}</strong>`
      );

  const bodyHtml = [
    emailParagraph(`Bonjour${adherentName ? ` <strong>${safeName}</strong>` : ""},`),
    emailParagraph(
      `Bonne nouvelle&nbsp;: votre dossier d'adhésion <strong>SQY Ping</strong> a été relu et <strong>validé administrativement</strong> par le secrétariat.`
    ),
    emailParagraph(
      "Vous pouvez maintenant procéder au règlement en ligne via notre plateforme de paiement sécurisée Stripe."
    ),
    emailParagraph(BNPL_PAYMENT_REQUEST_PARAGRAPH),
    breakdownBlock,
    emailMutedParagraph(
      "Après paiement, une facture détaillée vous sera transmise automatiquement par Stripe à la même adresse e-mail."
    ),
    emailMutedParagraph(
      `Besoin d'aide&nbsp;? Répondez à cet e-mail ou contactez le secrétariat via <a href="${escapeHtml(appOrigin)}/club" style="color: ${SQYPING_COLORS.primary.main}; text-decoration: none;">${escapeHtml(SQYPING_EMAIL_APP_NAME)}</a>.`
    ),
  ].join("");

  const html = buildSqyPingEmailLayout({
    title: "Paiement de votre adhésion",
    preheader: `Votre adhésion SQY Ping est validée — montant : ${formattedAmount}.`,
    bodyHtml,
    appOrigin,
    primaryAction: {
      label: "Payer en ligne",
      url: checkoutUrl,
    },
    fallbackLink: checkoutUrl,
    noticeHtml: `
      <p style="margin: 0; font-size: 14px; line-height: 1.6;">
        <strong>Paiement sécurisé</strong> — vous serez redirigé(e) vers Stripe. ${escapeHtml(BNPL_PAYMENT_REQUEST_NOTICE)} Aucune donnée bancaire n'est collectée par ${escapeHtml(SQYPING_EMAIL_APP_NAME)}.
      </p>
    `,
    noticeVariant: "info",
  });

  const textLines = [
    `Bonjour${adherentName ? ` ${adherentName}` : ""},`,
    "",
    "Votre dossier d'adhésion SQY Ping a été relu et validé administrativement.",
    "",
  ];

  if (hasDetailedQuote) {
    textLines.push("Détail :", formatQuoteBreakdownText(quote!), "");
  } else {
    textLines.push(`Montant à régler : ${formattedAmount}.`, "");
  }

  textLines.push(
    BNPL_PAYMENT_REQUEST_TEXT_LINE,
    checkoutUrl,
    "",
    "Une facture détaillée sera disponible après paiement.",
    "",
    SQYPING_EMAIL_APP_NAME
  );

  return { html, text: textLines.join("\n") };
}
