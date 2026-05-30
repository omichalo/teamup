import crypto from "node:crypto";
import type {
  StripeCheckoutLineItem,
  StripeInvoiceCustomField,
} from "@/lib/pricing/stripe-checkout-lines";

export interface StripeCheckoutSession {
  id: string;
  url: string | null;
  payment_status?: string;
  metadata?: Record<string, string>;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function getAppBaseUrl(req?: Request): string {
  const configured = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  if (req) {
    const url = new URL(req.url);
    return `${url.protocol}//${url.host}`;
  }
  throw new Error("Missing APP_URL or NEXT_PUBLIC_APP_URL");
}

export async function createMembershipCheckoutSession(params: {
  registrationId: string;
  lineItems: StripeCheckoutLineItem[];
  customerEmail: string;
  /** Description de facture (en-tête) — identité dossier, pas les lignes. */
  invoiceDescription: string;
  catalogVersion: string;
  quoteHash: string;
  successUrl: string;
  cancelUrl: string;
  /** Champs informatifs sur la facture (ex. détail des remises). */
  invoiceCustomFields?: StripeInvoiceCustomField[];
}): Promise<StripeCheckoutSession> {
  if (params.lineItems.length === 0) {
    throw new Error("Au moins une ligne de paiement est requise.");
  }

  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("customer_email", params.customerEmail);
  body.set("success_url", params.successUrl);
  body.set("cancel_url", params.cancelUrl);
  body.set("client_reference_id", params.registrationId);
  body.set("metadata[registrationId]", params.registrationId);
  body.set("metadata[catalogVersion]", params.catalogVersion);
  body.set("metadata[quoteHash]", params.quoteHash);
  body.set("payment_intent_data[metadata][registrationId]", params.registrationId);
  body.set("payment_intent_data[metadata][catalogVersion]", params.catalogVersion);
  body.set("payment_intent_data[metadata][quoteHash]", params.quoteHash);
  body.set("invoice_creation[enabled]", "true");
  body.set("invoice_creation[invoice_data][description]", params.invoiceDescription);

  (params.invoiceCustomFields ?? []).forEach((field, index) => {
    body.set(`invoice_creation[invoice_data][custom_fields][${index}][name]`, field.name);
    body.set(`invoice_creation[invoice_data][custom_fields][${index}][value]`, field.value);
  });

  params.lineItems.forEach((item, index) => {
    body.set(`line_items[${index}][quantity]`, "1");
    body.set(`line_items[${index}][price_data][currency]`, "eur");
    body.set(`line_items[${index}][price_data][unit_amount]`, String(item.amountCents));
    body.set(`line_items[${index}][price_data][product_data][name]`, item.name);
    if (item.description) {
      body.set(
        `line_items[${index}][price_data][product_data][description]`,
        item.description
      );
    }
  });

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireEnv("STRIPE_SECRET_KEY")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const json = (await response.json()) as StripeCheckoutSession & {
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(json.error?.message || "Impossible de créer la session Stripe");
  }
  return json;
}

/** @deprecated Préférer `createMembershipCheckoutSession` avec `lineItems` issus du devis. */
export async function createLegacySingleLineCheckoutSession(params: {
  registrationId: string;
  amountCents: number;
  customerEmail: string;
  adherentName: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<StripeCheckoutSession> {
  return createMembershipCheckoutSession({
    registrationId: params.registrationId,
    lineItems: [
      {
        name: "Adhésion SQY Ping",
        amountCents: params.amountCents,
        description: `Dossier ${params.registrationId}`,
      },
    ],
    customerEmail: params.customerEmail,
    invoiceDescription: `Adhésion SQY Ping — ${params.adherentName}`,
    catalogVersion: "legacy",
    quoteHash: "legacy",
    successUrl: params.successUrl,
    cancelUrl: params.cancelUrl,
  });
}

export type StripeInvoiceLinks = {
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
};

/** Récupère les URLs publiques Stripe pour consulter / télécharger une facture. */
export async function retrieveStripeInvoiceLinks(
  invoiceId: string
): Promise<StripeInvoiceLinks> {
  const response = await fetch(
    `https://api.stripe.com/v1/invoices/${encodeURIComponent(invoiceId)}`,
    {
      headers: {
        Authorization: `Bearer ${requireEnv("STRIPE_SECRET_KEY")}`,
      },
      cache: "no-store",
    }
  );

  const json = (await response.json()) as {
    hosted_invoice_url?: string | null;
    invoice_pdf?: string | null;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(json.error?.message ?? "Impossible de récupérer la facture Stripe");
  }

  return {
    hostedInvoiceUrl: json.hosted_invoice_url ?? null,
    invoicePdf: json.invoice_pdf ?? null,
  };
}

/** URL à ouvrir côté adhérent : PDF si disponible, sinon page hébergée Stripe. */
export function pickInvoiceDownloadUrl(links: StripeInvoiceLinks): string | null {
  return links.invoicePdf ?? links.hostedInvoiceUrl ?? null;
}

/**
 * Point d'extension pour le paiement CB multi-échéances.
 * V1 : paiement unique via Checkout ; installments > 1 → suivi manuel secrétariat.
 */
export async function createStripePaymentForRegistration(params: {
  registrationId: string;
  amountToPayCents: number;
  installments: number;
}): Promise<{ supported: boolean; reason?: string }> {
  if (params.amountToPayCents <= 0) {
    return { supported: false, reason: "Aucun montant à régler" };
  }
  if (params.installments > 1) {
    return {
      supported: false,
      reason:
        "Paiement carte en plusieurs fois : pas encore de lien automatique. Le secrétariat suit les échéances dans le tableau ci-dessus.",
    };
  }
  return { supported: true };
}

export function verifyStripeWebhookSignature(
  payload: string,
  signatureHeader: string | null
): boolean {
  if (!signatureHeader) {
    return false;
  }

  const secret = requireEnv("STRIPE_WEBHOOK_SECRET");
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.split("=", 2);
      return [key, value];
    })
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) {
    return false;
  }

  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedPayload, "utf8")
    .digest("hex");

  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  );
}
