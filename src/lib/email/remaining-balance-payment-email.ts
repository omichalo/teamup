import { SQYPING_COLORS, SQYPING_EMAIL_APP_NAME } from "@/lib/email/brand";
import { escapeHtml } from "@/lib/email/escape-html";
import {
  buildSqyPingEmailLayout,
  emailMutedParagraph,
  emailParagraph,
  emailSecretariatContactText,
  emailSecretariatMailtoLink,
} from "@/lib/email/layout";
import {
  BNPL_PAYMENT_REQUEST_NOTICE,
  BNPL_PAYMENT_REQUEST_PARAGRAPH,
  CHECKOUT_LINK_VALIDITY_NOTICE,
  PAYMENT_EMAIL_CTA_LABEL,
} from "@/lib/club-registration/payment/bnpl-checkout-copy";
import { formatEurosForEmail } from "@/lib/email/format-euros";
import { PAYMENT_METHOD_LABELS } from "@/lib/club-registration/payment-constants";
import type { PaymentMethodId } from "@/lib/club-registration/payment-constants";

export type RemainingBalancePaymentEmailContent = {
  adherentName: string;
  remainingAmountCents: number;
  paidAmountCents: number;
  amountToPayCents: number;
  checkoutUrl: string;
  appOrigin: string;
  originalPaymentMethod?: PaymentMethodId;
};

export function buildRemainingBalancePaymentEmailSubject(adherentName: string): string {
  return `Solde de votre adhésion SQY Ping - ${adherentName}`;
}

export function buildRemainingBalancePaymentEmail(
  options: RemainingBalancePaymentEmailContent
): { html: string; text: string } {
  const {
    adherentName,
    remainingAmountCents,
    paidAmountCents,
    amountToPayCents,
    checkoutUrl,
    appOrigin,
    originalPaymentMethod,
  } = options;
  const safeName = escapeHtml(adherentName);
  const remaining = formatEurosForEmail(remainingAmountCents);
  const paid = formatEurosForEmail(paidAmountCents);
  const totalDue = formatEurosForEmail(amountToPayCents);
  const methodLabel =
    originalPaymentMethod != null
      ? PAYMENT_METHOD_LABELS[originalPaymentMethod]
      : null;

  const bodyHtml = [
    emailParagraph(`Bonjour${adherentName ? ` <strong>${safeName}</strong>` : ""},`),
    emailParagraph(
      `Le secrétariat a enregistré un règlement partiel de votre adhésion <strong>SQY Ping</strong>. Il reste un solde à régler en ligne.`
    ),
    emailParagraph(
      `Montant initial à régler&nbsp;: <strong>${escapeHtml(totalDue)}</strong><br/>` +
        `Déjà reçu&nbsp;: <strong>${escapeHtml(paid)}</strong><br/>` +
        `Solde à régler&nbsp;: <strong style="color: ${SQYPING_COLORS.primary.main};">${escapeHtml(remaining)}</strong>` +
        (methodLabel
          ? `<br/>Mode initialement prévu&nbsp;: ${escapeHtml(methodLabel)}`
          : "")
    ),
    emailParagraph(BNPL_PAYMENT_REQUEST_PARAGRAPH),
  ].join("");

  const afterActionHtml = [
    emailMutedParagraph(CHECKOUT_LINK_VALIDITY_NOTICE),
    emailMutedParagraph(
      "Après paiement, une facture détaillée vous sera transmise automatiquement par Stripe à la même adresse e-mail."
    ),
    emailMutedParagraph(
      `Besoin d'aide&nbsp;? Répondez à cet e-mail ou contactez le secrétariat par e-mail à ${emailSecretariatMailtoLink()}.`
    ),
  ].join("");

  const html = buildSqyPingEmailLayout({
    title: "Solde de votre adhésion",
    preheader: `Réglez le solde de votre adhésion SQY Ping — ${remaining}.`,
    bodyHtml,
    appOrigin,
    primaryAction: {
      label: PAYMENT_EMAIL_CTA_LABEL,
      url: checkoutUrl,
    },
    fallbackLink: checkoutUrl,
    noticeHtml: `
      <p style="margin: 0; font-size: 14px; line-height: 1.6;">
        <strong>Paiement sécurisé</strong> — vous serez redirigé(e) vers Stripe. ${escapeHtml(BNPL_PAYMENT_REQUEST_NOTICE)} Aucune donnée bancaire n'est collectée par ${escapeHtml(SQYPING_EMAIL_APP_NAME)}.
      </p>
    `,
    noticeVariant: "info",
    afterActionHtml,
  });

  const textLines = [
    `Bonjour${adherentName ? ` ${adherentName}` : ""},`,
    "",
    "Le secrétariat a enregistré un règlement partiel de votre adhésion SQY Ping. Il reste un solde à régler en ligne.",
    "",
    `Montant initial à régler : ${totalDue}`,
    `Déjà reçu : ${paid}`,
    `Solde à régler : ${remaining}`,
    ...(methodLabel ? [`Mode initialement prévu : ${methodLabel}`] : []),
    "",
    BNPL_PAYMENT_REQUEST_PARAGRAPH,
    "",
    `${PAYMENT_EMAIL_CTA_LABEL} :`,
    checkoutUrl,
    "",
    CHECKOUT_LINK_VALIDITY_NOTICE,
    "",
    "Une facture détaillée sera disponible après paiement.",
    "",
    emailSecretariatContactText("Besoin d'aide ? Contactez le secrétariat par e-mail à"),
    "",
    SQYPING_EMAIL_APP_NAME,
  ];

  return { html, text: textLines.join("\n") };
}
