import crypto from "node:crypto";
import { resolveAppOrigin } from "@/lib/auth/resolve-app-origin";
import type {
  StripeCheckoutLineItem,
  StripeInvoiceCustomField,
} from "@/lib/pricing/stripe-checkout-lines";
import {
  PAYMENT_METHOD_LABELS,
  type PaymentMethodId,
} from "@/lib/club-registration/payment-constants";

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

/** URL publique de l'app (Stripe success/cancel, etc.) — même logique que les mails Auth. */
export function getAppBaseUrl(req: Request): string {
  return resolveAppOrigin(req);
}

export async function createMembershipCheckoutSession(params: {
  registrationId: string;
  lineItems: StripeCheckoutLineItem[];
  customerEmail: string;
  /** Nom affiché côté Stripe (colonne Client, facture). */
  customerName: string;
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

  const customerId = await findOrCreateStripeCheckoutCustomer({
    registrationId: params.registrationId,
    customerEmail: params.customerEmail,
    customerName: params.customerName,
  });

  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("customer", customerId);
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
    customerName: params.adherentName,
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

type StripeInvoice = {
  id: string;
  hosted_invoice_url?: string | null;
  invoice_pdf?: string | null;
  error?: { message?: string };
};

function stripeAuthHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${requireEnv("STRIPE_SECRET_KEY")}`,
  };
}

async function postStripeForm<T>(
  path: string,
  body: URLSearchParams
): Promise<T & { error?: { message?: string } }> {
  const response = await fetch(`https://api.stripe.com${path}`, {
    method: "POST",
    headers: {
      ...stripeAuthHeaders(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const json = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(json.error?.message ?? "Erreur Stripe");
  }
  return json;
}

async function getStripeForm<T>(
  path: string,
  query?: URLSearchParams
): Promise<T & { error?: { message?: string } }> {
  const queryString = query?.toString();
  const url = `https://api.stripe.com${path}${queryString ? `?${queryString}` : ""}`;
  const response = await fetch(url, {
    headers: stripeAuthHeaders(),
    cache: "no-store",
  });

  const json = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(json.error?.message ?? "Erreur Stripe");
  }
  return json;
}

/** Client Stripe avec nom pour alimenter le Dashboard et les factures Checkout. */
async function findOrCreateStripeCheckoutCustomer(params: {
  registrationId: string;
  customerEmail: string;
  customerName: string;
}): Promise<string> {
  const listQuery = new URLSearchParams();
  listQuery.set("email", params.customerEmail);
  listQuery.set("limit", "1");

  const list = await getStripeForm<{ data: Array<{ id: string; name?: string | null }> }>(
    "/v1/customers",
    listQuery
  );

  const existing = list.data[0];
  if (existing) {
    if (existing.name !== params.customerName) {
      const updateBody = new URLSearchParams();
      updateBody.set("name", params.customerName);
      updateBody.set("metadata[registrationId]", params.registrationId);
      await postStripeForm<{ id: string }>(
        `/v1/customers/${encodeURIComponent(existing.id)}`,
        updateBody
      );
    }
    return existing.id;
  }

  const createBody = new URLSearchParams();
  createBody.set("email", params.customerEmail);
  createBody.set("name", params.customerName);
  createBody.set("metadata[registrationId]", params.registrationId);
  const customer = await postStripeForm<{ id: string }>("/v1/customers", createBody);
  return customer.id;
}

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

/**
 * Crée une facture Stripe "payée hors ligne" pour les encaissements manuels.
 * Permet d'avoir un format de facture homogène (Checkout + hors Checkout).
 */
export async function createPaidOutOfBandInvoice(params: {
  registrationId: string;
  customerEmail: string;
  amountCents: number;
  description: string;
}): Promise<{ invoiceId: string }> {
  if (params.amountCents <= 0) {
    throw new Error("Montant de facture invalide");
  }

  const customerBody = new URLSearchParams();
  customerBody.set("email", params.customerEmail);
  customerBody.set("metadata[registrationId]", params.registrationId);
  const customer = await postStripeForm<{ id: string }>("/v1/customers", customerBody);

  const invoiceItemBody = new URLSearchParams();
  invoiceItemBody.set("customer", customer.id);
  invoiceItemBody.set("currency", "eur");
  invoiceItemBody.set("amount", String(params.amountCents));
  invoiceItemBody.set("description", `Adhésion SQY Ping — dossier ${params.registrationId}`);
  await postStripeForm<{ id: string }>("/v1/invoiceitems", invoiceItemBody);

  const invoiceBody = new URLSearchParams();
  invoiceBody.set("customer", customer.id);
  invoiceBody.set("description", params.description);
  invoiceBody.set("collection_method", "send_invoice");
  invoiceBody.set("auto_advance", "false");
  invoiceBody.set("metadata[registrationId]", params.registrationId);
  const draftInvoice = await postStripeForm<StripeInvoice>("/v1/invoices", invoiceBody);

  const finalizedInvoice = await postStripeForm<StripeInvoice>(
    `/v1/invoices/${encodeURIComponent(draftInvoice.id)}/finalize`,
    new URLSearchParams()
  );

  const payBody = new URLSearchParams();
  payBody.set("paid_out_of_band", "true");
  const paidInvoice = await postStripeForm<StripeInvoice>(
    `/v1/invoices/${encodeURIComponent(finalizedInvoice.id)}/pay`,
    payBody
  );

  return { invoiceId: paidInvoice.id };
}

/** URL à ouvrir côté adhérent : PDF si disponible, sinon page hébergée Stripe. */
export function pickInvoiceDownloadUrl(links: StripeInvoiceLinks): string | null {
  return links.invoicePdf ?? links.hostedInvoiceUrl ?? null;
}

/**
 * Point d'extension pour le paiement CB en ligne via Checkout (carte ou BNPL sur Stripe).
 * Les autres modes passent en suivi secrétariat.
 */
export async function createStripePaymentForRegistration(params: {
  registrationId: string;
  amountToPayCents: number;
  paymentMethod: PaymentMethodId;
}): Promise<{ supported: boolean; reason?: string }> {
  if (params.amountToPayCents <= 0) {
    return { supported: false, reason: "Aucun montant à régler" };
  }

  if (params.paymentMethod !== "card") {
    return {
      supported: false,
      reason: `Mode « ${PAYMENT_METHOD_LABELS[params.paymentMethod]} » : pas de lien de paiement en ligne. Suivez les encaissements dans le tableau ci-dessous.`,
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
