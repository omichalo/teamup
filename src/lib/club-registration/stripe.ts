import crypto from "node:crypto";

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
  amountCents: number;
  customerEmail: string;
  adherentName: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<StripeCheckoutSession> {
  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("customer_email", params.customerEmail);
  body.set("success_url", params.successUrl);
  body.set("cancel_url", params.cancelUrl);
  body.set("client_reference_id", params.registrationId);
  body.set("metadata[registrationId]", params.registrationId);
  body.set("payment_intent_data[metadata][registrationId]", params.registrationId);
  body.set("invoice_creation[enabled]", "true");
  body.set("line_items[0][quantity]", "1");
  body.set("line_items[0][price_data][currency]", "eur");
  body.set("line_items[0][price_data][unit_amount]", String(params.amountCents));
  body.set(
    "line_items[0][price_data][product_data][name]",
    `Adhésion SQY Ping - ${params.adherentName}`
  );
  body.set(
    "line_items[0][price_data][product_data][description]",
    `Dossier d'adhésion ${params.registrationId}`
  );

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
