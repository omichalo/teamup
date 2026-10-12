import { buildSqyPingEmailLayout } from "@/lib/email/layout";
import { getSqyPingLogoAttachment } from "@/lib/email/logo-attachment";
import { sendMail } from "@/lib/mailer";
import { resolveAppOrigin } from "@/lib/auth/resolve-app-origin";
import type { CampRegistration } from "./types";

function resolveEmailAppOrigin(): string {
  const candidates = [process.env.APP_URL, process.env.NEXT_PUBLIC_APP_URL]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  return (candidates[0] ?? "https://teamup.sqyping.fr").replace(/\/$/, "");
}

export async function dispatchCampPaymentConfirmedEmail(
  registration: CampRegistration,
  req?: Request
): Promise<boolean> {
  const email = registration.email.trim();
  if (!email) return false;

  const appOrigin = req ? resolveAppOrigin(req) : resolveEmailAppOrigin();
  const name = `${registration.firstName} ${registration.lastName}`.trim();
  const amount = (registration.pricingQuote.totalCents / 100).toFixed(2);
  const invoice = registration.payment.invoiceNumber ?? "—";

  const html = buildSqyPingEmailLayout({
    title: "Paiement stage enregistré",
    preheader: `Paiement confirmé pour le stage de ${name}`,
    appOrigin,
    bodyHtml: `<p>Bonjour ${name},</p>
<p>Nous avons bien enregistré votre paiement de <strong>${amount}&nbsp;€</strong> pour votre inscription stage.</p>
<p>Facture&nbsp;: <strong>${invoice}</strong></p>`,
    primaryAction: {
      label: "Voir mes stages",
      url: `${appOrigin}/club/mes-stages`,
    },
  });

  const text = [
    `Bonjour ${name},`,
    `Paiement de ${amount} € enregistré pour votre inscription stage.`,
    `Facture : ${invoice}`,
    `Mes stages : ${appOrigin}/club/mes-stages`,
  ].join("\n");

  await sendMail({
    to: [email],
    subject: `Paiement enregistré — stage ${name}`,
    html,
    text,
    attachments: [getSqyPingLogoAttachment()],
  });
  return true;
}
