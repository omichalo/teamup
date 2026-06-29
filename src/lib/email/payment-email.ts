import { SQYPING_COLORS, SQYPING_EMAIL_APP_NAME } from "@/lib/email/brand";
import { escapeHtml } from "@/lib/email/escape-html";
import {
  buildSqyPingEmailLayout,
  emailMutedParagraph,
  emailParagraph,
  emailSectionTitle,
  emailSecretariatContactText,
  emailSecretariatMailtoLink,
} from "@/lib/email/layout";
import {
  BNPL_PAYMENT_REQUEST_NOTICE,
  BNPL_PAYMENT_REQUEST_PARAGRAPH,
  CHECKOUT_LINK_VALIDITY_FROM_MES_DOSSIERS_NOTICE,
  PAYMENT_EMAIL_CTA_LABEL,
  PAYMENT_EMAIL_HUB_INSTRUCTION_HTML,
  PAYMENT_EMAIL_HUB_INSTRUCTION_TEXT,
} from "@/lib/club-registration/payment/bnpl-checkout-copy";
import { buildMesInscriptionsUrl } from "@/lib/club-registration/mes-inscriptions-url";
import type { PriceQuote } from "@/lib/pricing/types";
import type { DonationPricingBreakdown } from "@/lib/pricing/donation-discount";
import {
  formatDonationBreakdownHtml,
  formatDonationBreakdownText,
  formatSecretariatAidsBreakdownHtml,
  formatSecretariatAidsBreakdownText,
  resolveEmailPayableTotalCents,
} from "@/lib/email/donation-breakdown-email";
import type { PaymentAid } from "@/lib/club-registration/payment/types";

import { formatEurosForEmail } from "@/lib/email/format-euros";

export { formatEurosForEmail };

export type QuoteBreakdownEmailOptions = {
  /** Montant réellement à régler (après aides secrétariat). */
  amountToPayCents?: number;
  secretariatAids?: PaymentAid[];
};

function resolveBreakdownPayableCents(
  quote: PriceQuote,
  donation: DonationPricingBreakdown | null | undefined,
  options?: QuoteBreakdownEmailOptions
): number {
  if (options?.amountToPayCents != null) {
    return options.amountToPayCents;
  }
  return resolveEmailPayableTotalCents(quote.totalCents, donation);
}

export function formatQuoteBreakdownText(
  quote: PriceQuote,
  donation?: DonationPricingBreakdown | null,
  options?: QuoteBreakdownEmailOptions
): string {
  const lines = quote.lines
    .filter((line) => line.kind !== "info" && line.amountCents !== 0)
    .map((line) => `  - ${line.label} : ${formatEurosForEmail(line.amountCents)}`);
  const donationLines = donation ? formatDonationBreakdownText(donation) : "";
  const aidLines = options?.secretariatAids?.length
    ? formatSecretariatAidsBreakdownText(options.secretariatAids)
    : "";
  const payable = resolveBreakdownPayableCents(quote, donation, options);

  return [
    ...lines,
    ...(donationLines ? [donationLines] : []),
    ...(aidLines ? [aidLines] : []),
    `  Total : ${formatEurosForEmail(payable)}`,
  ].join("\n");
}

export function formatQuoteBreakdownHtmlForEmail(
  quote: PriceQuote,
  donation?: DonationPricingBreakdown | null,
  options?: QuoteBreakdownEmailOptions
): string {
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
  const donationRows = donation ? formatDonationBreakdownHtml(donation) : "";
  const aidRows = options?.secretariatAids?.length
    ? formatSecretariatAidsBreakdownHtml(options.secretariatAids)
    : "";
  const payable = resolveBreakdownPayableCents(quote, donation, options);

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 8px 0; border: 1px solid ${SQYPING_COLORS.surface.divider}; border-radius: 12px; overflow: hidden;">
      ${rows}
      ${donationRows}
      ${aidRows}
      <tr style="background-color: rgba(40, 48, 109, 0.04);">
        <td style="padding: 12px; font-size: 15px; font-weight: 700; color: ${SQYPING_COLORS.primary.main};">
          Total à régler
        </td>
        <td align="right" style="padding: 12px; font-size: 16px; font-weight: 700; color: ${SQYPING_COLORS.primary.main}; white-space: nowrap;">
          ${escapeHtml(formatEurosForEmail(payable))}
        </td>
      </tr>
    </table>
  `;
}

export type PaymentRequestEmailVariant = "initial" | "resend";

export type PaymentRequestEmailContent = {
  registrationId: string;
  adherentName: string;
  amountCents: number;
  appOrigin: string;
  quote?: PriceQuote | null;
  donationPricing?: DonationPricingBreakdown | null;
  secretariatAids?: PaymentAid[];
  variant?: PaymentRequestEmailVariant;
};

export function buildPaymentRequestEmailSubject(
  adherentName: string,
  variant: PaymentRequestEmailVariant = "initial"
): string {
  if (variant === "resend") {
    return `Rappel — paiement de votre adhésion SQY Ping - ${adherentName}`;
  }
  return `Paiement de votre adhésion SQY Ping - ${adherentName}`;
}

export function buildPaymentRequestEmail(
  options: PaymentRequestEmailContent
): { html: string; text: string } {
  const {
    registrationId,
    adherentName,
    amountCents,
    appOrigin,
    quote,
    donationPricing,
    secretariatAids,
    variant = "initial",
  } = options;
  const safeName = escapeHtml(adherentName);
  const formattedAmount = formatEurosForEmail(amountCents);
  const hasDetailedQuote = Boolean(quote && quote.lines.length > 0);
  const mesInscriptionsUrl = buildMesInscriptionsUrl(appOrigin, registrationId);
  const breakdownOptions: QuoteBreakdownEmailOptions = {
    amountToPayCents: amountCents,
    ...(secretariatAids?.length ? { secretariatAids } : {}),
  };

  const breakdownBlock = hasDetailedQuote
    ? `${emailSectionTitle("Détail de votre adhésion")}${formatQuoteBreakdownHtmlForEmail(quote!, donationPricing, breakdownOptions)}`
    : emailParagraph(
        `Montant à régler : <strong style="color: ${SQYPING_COLORS.primary.main};">${escapeHtml(formattedAmount)}</strong>`
      );

  const introHtml =
    variant === "resend"
      ? emailParagraph(
          `Rappel&nbsp;: votre adhésion <strong>SQY Ping</strong> attend encore votre règlement.`
        )
      : emailParagraph(
          `Bonne nouvelle&nbsp;: votre dossier d'adhésion <strong>SQY Ping</strong> a été relu et <strong>validé administrativement</strong> par le secrétariat.`
        );

  const introText =
    variant === "resend"
      ? "Rappel : votre adhésion SQY Ping attend encore votre règlement."
      : "Votre dossier d'adhésion SQY Ping a été relu et validé administrativement.";

  const bodyHtml = [
    emailParagraph(`Bonjour${adherentName ? ` <strong>${safeName}</strong>` : ""},`),
    introHtml,
    emailParagraph(PAYMENT_EMAIL_HUB_INSTRUCTION_HTML),
    emailParagraph(BNPL_PAYMENT_REQUEST_PARAGRAPH),
    breakdownBlock,
  ].join("");

  const afterActionHtml = [
    emailMutedParagraph(CHECKOUT_LINK_VALIDITY_FROM_MES_DOSSIERS_NOTICE),
    emailMutedParagraph(
      "Après paiement, une facture détaillée vous sera transmise automatiquement par Stripe à la même adresse e-mail."
    ),
    emailMutedParagraph(
      `Besoin d'aide&nbsp;? Répondez à cet e-mail ou contactez le secrétariat par e-mail à ${emailSecretariatMailtoLink()}.`
    ),
  ].join("");

  const html = buildSqyPingEmailLayout({
    title: variant === "resend" ? "Rappel — paiement de votre adhésion" : "Paiement de votre adhésion",
    preheader:
      variant === "resend"
        ? `Finalisez votre adhésion SQY Ping — montant : ${formattedAmount}.`
        : `Votre adhésion SQY Ping est validée — montant : ${formattedAmount}.`,
    bodyHtml,
    appOrigin,
    primaryAction: {
      label: PAYMENT_EMAIL_CTA_LABEL,
      url: mesInscriptionsUrl,
    },
    fallbackLink: mesInscriptionsUrl,
    noticeHtml: `
      <p style="margin: 0; font-size: 14px; line-height: 1.6;">
        <strong>Paiement sécurisé</strong> — depuis Mes dossiers, vous serez redirigé(e) vers Stripe. ${escapeHtml(BNPL_PAYMENT_REQUEST_NOTICE)} Aucune donnée bancaire n'est collectée par ${escapeHtml(SQYPING_EMAIL_APP_NAME)}.
      </p>
    `,
    noticeVariant: "info",
    afterActionHtml,
  });

  const textLines = [
    `Bonjour${adherentName ? ` ${adherentName}` : ""},`,
    "",
    introText,
    "",
    PAYMENT_EMAIL_HUB_INSTRUCTION_TEXT,
    "",
    BNPL_PAYMENT_REQUEST_PARAGRAPH,
    "",
  ];

  if (hasDetailedQuote) {
    textLines.push("Détail :", formatQuoteBreakdownText(quote!, donationPricing, breakdownOptions), "");
  } else {
    textLines.push(`Montant à régler : ${formattedAmount}.`, "");
  }

  textLines.push(
    `${PAYMENT_EMAIL_CTA_LABEL} :`,
    mesInscriptionsUrl,
    "",
    CHECKOUT_LINK_VALIDITY_FROM_MES_DOSSIERS_NOTICE,
    "",
    "Une facture détaillée sera disponible après paiement.",
    "",
    emailSecretariatContactText("Besoin d'aide ? Contactez le secrétariat par e-mail à"),
    "",
    SQYPING_EMAIL_APP_NAME
  );

  return { html, text: textLines.join("\n") };
}
