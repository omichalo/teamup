import {
  CHECK_PAYABLE_TO,
  PAYMENT_METHOD_LABELS,
  REMAINING_PAYMENT_METHOD_LABELS,
  type PaymentMethodId,
  type RemainingPaymentMethodId,
} from "@/lib/club-registration/payment-constants";
import type { ExpectedPayment } from "@/lib/club-registration/payment/types";
import { SQYPING_COLORS, SQYPING_EMAIL_APP_NAME, SQYPING_SECRETARIAT_EMAIL } from "@/lib/email/brand";
import { escapeHtml } from "@/lib/email/escape-html";
import {
  buildSqyPingEmailLayout,
  emailMutedParagraph,
  emailParagraph,
  emailSectionTitle,
  emailSecretariatContactHtml,
  emailSecretariatContactText,
  emailSecretariatMailtoLink,
} from "@/lib/email/layout";
import {
  formatEurosForEmail,
  formatQuoteBreakdownHtmlForEmail,
  formatQuoteBreakdownText,
} from "@/lib/email/payment-email";
import {
  BNPL_INSTRUCTIONS_CARD_HTML,
  BNPL_INSTRUCTIONS_CARD_TEXT,
} from "@/lib/club-registration/payment/bnpl-checkout-copy";
import type { PriceQuote } from "@/lib/pricing/types";

export type PaymentInstructionsEmailContent = {
  adherentName: string;
  amountCents: number;
  registrationId: string;
  appOrigin: string;
  paymentMethod: PaymentMethodId;
  paymentInstallments: number;
  expectedPayments: ExpectedPayment[];
  holidayVoucherAmountCents?: number;
  remainingPaymentMethod?: RemainingPaymentMethodId;
  specialPaymentNote?: string;
  paymentNote?: string;
  quote?: PriceQuote | null;
};

function formatExpectedPaymentsHtml(expectedPayments: ExpectedPayment[]): string {
  const rows = expectedPayments
    .filter((line) => line.status !== "cancelled")
    .map(
      (line) => `
        <tr>
          <td style="padding: 10px 12px; font-size: 15px; color: ${SQYPING_COLORS.text.primary}; border-bottom: 1px solid ${SQYPING_COLORS.surface.divider};">
            ${escapeHtml(line.label)}
          </td>
          <td align="right" style="padding: 10px 12px; font-size: 15px; font-weight: 600; color: ${SQYPING_COLORS.text.primary}; border-bottom: 1px solid ${SQYPING_COLORS.surface.divider}; white-space: nowrap;">
            ${escapeHtml(formatEurosForEmail(line.expectedAmountCents))}
          </td>
        </tr>
      `
    )
    .join("");

  if (!rows) {
    return "";
  }

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 8px 0; border: 1px solid ${SQYPING_COLORS.surface.divider}; border-radius: 12px; overflow: hidden;">
      ${rows}
    </table>
  `;
}

function formatExpectedPaymentsText(expectedPayments: ExpectedPayment[]): string {
  return expectedPayments
    .filter((line) => line.status !== "cancelled")
    .map((line) => `  - ${line.label} : ${formatEurosForEmail(line.expectedAmountCents)}`)
    .join("\n");
}

function buildMethodInstructionsHtml(
  content: PaymentInstructionsEmailContent,
  safeAdherentName: string
): string {
  const { paymentMethod, paymentInstallments, expectedPayments } = content;

  if (paymentMethod === "cheque") {
    const schedule =
      expectedPayments.length > 0
        ? `${emailSectionTitle("Échéancier")}${formatExpectedPaymentsHtml(expectedPayments)}`
        : "";

    return [
      emailParagraph(
        `Règlement par <strong>chèque</strong>${paymentInstallments > 1 ? ` en ${paymentInstallments} fois` : ""}&nbsp;:`
      ),
      `<ul style="margin: 0 0 16px 0; padding-left: 20px; font-size: 15px; line-height: 1.65; color: ${SQYPING_COLORS.text.primary};">
        <li>Établissez le ou les chèques à l'ordre de <strong>${escapeHtml(CHECK_PAYABLE_TO)}</strong>.</li>
        <li>Inscrivez le nom de l'adhérent (<strong>${safeAdherentName}</strong>) au dos de chaque chèque.</li>
        <li>Remettez votre règlement au secrétariat du club ou suivez les consignes qui vous seront précisées.</li>
      </ul>`,
      schedule,
    ].join("");
  }

  if (paymentMethod === "holiday_vouchers") {
    const cvAmount =
      content.holidayVoucherAmountCents && content.holidayVoucherAmountCents > 0
        ? formatEurosForEmail(content.holidayVoucherAmountCents)
        : null;
    const complement = content.remainingPaymentMethod
      ? REMAINING_PAYMENT_METHOD_LABELS[content.remainingPaymentMethod]
      : null;

    return [
      emailParagraph("Règlement avec <strong>chèques vacances</strong>&nbsp;:"),
      `<ul style="margin: 0 0 16px 0; padding-left: 20px; font-size: 15px; line-height: 1.65; color: ${SQYPING_COLORS.text.primary};">
        ${cvAmount ? `<li>Montant prévu en chèques vacances&nbsp;: <strong>${escapeHtml(cvAmount)}</strong>.</li>` : "<li>Préparez vos chèques vacances pour la part couverte par ce moyen de paiement.</li>"}
        ${complement ? `<li>Complément prévu&nbsp;: <strong>${escapeHtml(complement)}</strong>.</li>` : ""}
        <li>Contactez le secrétariat à ${emailSecretariatMailtoLink()} pour convenir de la remise des titres et du solde éventuel.</li>
      </ul>`,
    ].join("");
  }

  if (paymentMethod === "other") {
    const note = content.specialPaymentNote?.trim();
    return [
      emailParagraph("Votre dossier est traité selon un <strong>mode de règlement particulier</strong>."),
      note
        ? emailParagraph(`Rappel de votre situation&nbsp;: <em>${escapeHtml(note)}</em>`)
        : "",
      emailParagraph(
        "Le secrétariat vous contactera ou vous indiquera la marche à suivre pour finaliser le règlement."
      ),
    ].join("");
  }

  if (paymentMethod === "card") {
    return emailParagraph(
      `Mode de règlement&nbsp;: <strong>${escapeHtml(PAYMENT_METHOD_LABELS.card)}</strong>. ${escapeHtml(BNPL_INSTRUCTIONS_CARD_HTML)}`
    );
  }

  return emailParagraph(
    `Mode de règlement&nbsp;: <strong>${escapeHtml(PAYMENT_METHOD_LABELS[paymentMethod])}</strong>. Le secrétariat vous précisera la marche à suivre.`
  );
}

function buildMethodInstructionsText(content: PaymentInstructionsEmailContent): string {
  const { paymentMethod, paymentInstallments, expectedPayments, adherentName } = content;

  if (paymentMethod === "cheque") {
    const lines = [
      `Règlement par chèque${paymentInstallments > 1 ? ` en ${paymentInstallments} fois` : ""} :`,
      `- Chèques à l'ordre de ${CHECK_PAYABLE_TO}`,
      `- Nom de l'adhérent au dos : ${adherentName}`,
      "- Remise au secrétariat du club",
    ];
    const schedule = formatExpectedPaymentsText(expectedPayments);
    if (schedule) {
      lines.push("", "Échéancier :", schedule);
    }
    return lines.join("\n");
  }

  if (paymentMethod === "holiday_vouchers") {
    const lines = ["Règlement avec chèques vacances :"];
    if (content.holidayVoucherAmountCents && content.holidayVoucherAmountCents > 0) {
      lines.push(`- Montant prévu en CV : ${formatEurosForEmail(content.holidayVoucherAmountCents)}`);
    }
    if (content.remainingPaymentMethod) {
      lines.push(
        `- Complément prévu : ${REMAINING_PAYMENT_METHOD_LABELS[content.remainingPaymentMethod]}`
      );
    }
    lines.push(`- Contactez le secrétariat à ${SQYPING_SECRETARIAT_EMAIL} pour la remise des titres.`);
    return lines.join("\n");
  }

  if (paymentMethod === "other") {
    const lines = ["Mode de règlement particulier."];
    if (content.specialPaymentNote?.trim()) {
      lines.push(`Situation : ${content.specialPaymentNote.trim()}`);
    }
    lines.push("Le secrétariat vous indiquera la suite.");
    return lines.join("\n");
  }

  if (paymentMethod === "card") {
    return [
      "Carte bancaire.",
      "Le secrétariat vous enverra un lien Stripe sécurisé par e-mail.",
      BNPL_INSTRUCTIONS_CARD_TEXT,
    ].join("\n");
  }

  return `Mode : ${PAYMENT_METHOD_LABELS[paymentMethod]}. Contactez le secrétariat à ${SQYPING_SECRETARIAT_EMAIL}.`;
}

export function buildPaymentInstructionsEmail(
  options: PaymentInstructionsEmailContent
): { html: string; text: string } {
  const {
    adherentName,
    amountCents,
    registrationId,
    appOrigin,
    paymentNote,
    quote,
  } = options;

  const safeName = escapeHtml(adherentName);
  const formattedAmount = formatEurosForEmail(amountCents);
  const hasDetailedQuote = Boolean(quote && quote.lines.length > 0);
  const mesInscriptionsUrl = `${appOrigin.replace(/\/$/, "")}/club/mes-inscriptions?registration=${encodeURIComponent(registrationId)}`;

  const breakdownBlock = hasDetailedQuote
    ? `${emailSectionTitle("Détail de votre adhésion")}${formatQuoteBreakdownHtmlForEmail(quote!)}`
    : emailParagraph(
        `Montant à régler : <strong style="color: ${SQYPING_COLORS.primary.main};">${escapeHtml(formattedAmount)}</strong>`
      );

  const methodBlock = buildMethodInstructionsHtml(options, safeName);

  const adherentNoteBlock =
    paymentNote?.trim()
      ? emailMutedParagraph(
          `Votre message pour le secrétariat&nbsp;: «&nbsp;${escapeHtml(paymentNote.trim())}&nbsp;»`
        )
      : "";

  const bodyHtml = [
    emailParagraph(`Bonjour${adherentName ? ` <strong>${safeName}</strong>` : ""},`),
    emailParagraph(
      `Votre dossier d'adhésion <strong>SQY Ping</strong> a été relu et <strong>validé administrativement</strong> par le secrétariat.`
    ),
    breakdownBlock,
    `${emailSectionTitle("Modalités de règlement")}${methodBlock}`,
    adherentNoteBlock,
    emailMutedParagraph(
      `${emailSecretariatContactHtml()} Vous pouvez aussi consulter <a href="${escapeHtml(appOrigin)}/club/mes-inscriptions" style="color: ${SQYPING_COLORS.primary.main}; text-decoration: none;">votre espace adhérent</a>.`
    ),
  ].join("");

  const html = buildSqyPingEmailLayout({
    title: "Instructions de règlement",
    preheader: `Votre adhésion SQY Ping est validée — ${formattedAmount} à régler.`,
    bodyHtml,
    appOrigin,
    primaryAction: {
      label: "Suivre mon dossier",
      url: mesInscriptionsUrl,
    },
    fallbackLink: mesInscriptionsUrl,
  });

  const textLines = [
    `Bonjour${adherentName ? ` ${adherentName}` : ""},`,
    "",
    "Votre dossier d'adhésion SQY Ping a été validé administrativement.",
    "",
  ];

  if (hasDetailedQuote) {
    textLines.push("Détail :", formatQuoteBreakdownText(quote!), "");
  } else {
    textLines.push(`Montant à régler : ${formattedAmount}.`, "");
  }

  textLines.push(
    buildMethodInstructionsText(options),
    "",
    ...(paymentNote?.trim() ? [`Votre message : ${paymentNote.trim()}`, ""] : []),
    `Suivre mon dossier : ${mesInscriptionsUrl}`,
    "",
    emailSecretariatContactText(),
    "",
    SQYPING_EMAIL_APP_NAME
  );

  return { html, text: textLines.join("\n") };
}
