import type { DocumentData } from "firebase-admin/firestore";
import { resolveRegistrationContactEmail } from "@/lib/club-registration/resolve-registration-contact-email";
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
  const contactEmail = resolveRegistrationContactEmail(params.data);
  if (!contactEmail) {
    return false;
  }

  const adherentName =
    `${params.data.firstName ?? ""} ${params.data.lastName ?? ""}`.trim() || "adhérent";
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
    to: contactEmail,
    subject: `Paiement enregistré — adhésion ${adherentName}`,
    html: mail.html,
    text: mail.text,
    attachments: [getSqyPingLogoAttachment()],
  });

  return true;
}
