import type { DocumentData } from "firebase-admin/firestore";
import { formatPersonDisplayName } from "@/lib/shared/person-name-format";
import { resolveRegistrationPaymentRecipientEmails } from "@/lib/club-registration/resolve-registration-contact-email";
import { getSqyPingLogoAttachment } from "@/lib/email/logo-attachment";
import {
  buildPaymentConfirmedEmail,
  type PaymentConfirmedSource,
} from "@/lib/email/payment-confirmed-email";
import { sendMail } from "@/lib/mailer";
import { resolveAppOrigin } from "@/lib/auth/resolve-app-origin";

function resolveEmailAppOrigin(req?: Request): string {
  if (req) {
    return resolveAppOrigin(req);
  }

  const candidates = [process.env.APP_URL, process.env.NEXT_PUBLIC_APP_URL]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return (candidates[0] ?? "https://teamup.sqyping.fr").replace(/\/$/, "");
}

export async function dispatchPaymentConfirmedEmail(params: {
  registrationId: string;
  data: DocumentData;
  amountCents: number;
  source: PaymentConfirmedSource;
  req?: Request;
}): Promise<boolean> {
  const paymentEmails = resolveRegistrationPaymentRecipientEmails(params.data);
  if (paymentEmails.length === 0) {
    return false;
  }

  const adherentName =
    formatPersonDisplayName(
      typeof params.data.firstName === "string" ? params.data.firstName : undefined,
      typeof params.data.lastName === "string" ? params.data.lastName : undefined
    ) || "adhérent";
  const invoiceAvailable =
    typeof params.data.stripeInvoiceId === "string" && params.data.stripeInvoiceId.length > 0;

  const mail = buildPaymentConfirmedEmail({
    adherentName,
    amountCents: params.amountCents,
    registrationId: params.registrationId,
    appOrigin: resolveEmailAppOrigin(params.req),
    source: params.source,
    invoiceAvailable,
  });

  await sendMail({
    to: paymentEmails,
    subject: `Paiement enregistré — adhésion ${adherentName}`,
    html: mail.html,
    text: mail.text,
    attachments: [getSqyPingLogoAttachment()],
  });

  return true;
}
