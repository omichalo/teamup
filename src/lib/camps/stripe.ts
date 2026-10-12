import { getAppBaseUrl } from "@/lib/club-registration/stripe";
import type { CampRegistration } from "./types";

export { getAppBaseUrl };

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export type CampCheckoutSession = {
  id: string;
  url: string | null;
};

export async function createCampCheckoutSession(params: {
  registration: CampRegistration;
  campTitle: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<CampCheckoutSession> {
  const amount = params.registration.pricingQuote.totalCents;
  if (amount <= 0) {
    throw new Error("Montant de paiement invalide");
  }

  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("customer_email", params.registration.email);
  body.set("success_url", params.successUrl);
  body.set("cancel_url", params.cancelUrl);
  body.set("client_reference_id", params.registration.id);
  body.set("metadata[domain]", "camp");
  body.set("metadata[campRegistrationId]", params.registration.id);
  body.set("metadata[campId]", params.registration.campId);
  body.set("payment_intent_data[metadata][domain]", "camp");
  body.set(
    "payment_intent_data[metadata][campRegistrationId]",
    params.registration.id
  );
  body.set(
    "line_items[0][price_data][currency]",
    "eur"
  );
  body.set("line_items[0][price_data][unit_amount]", String(amount));
  body.set(
    "line_items[0][price_data][product_data][name]",
    `Stage — ${params.campTitle}`
  );
  body.set(
    "line_items[0][price_data][product_data][description]",
    `${params.registration.firstName} ${params.registration.lastName}`
  );
  body.set("line_items[0][quantity]", "1");
  body.set("expires_at", String(Math.floor(Date.now() / 1000) + 24 * 60 * 60));

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireEnv("STRIPE_SECRET_KEY")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Stripe checkout error: ${text.slice(0, 200)}`);
  }

  const session = (await response.json()) as CampCheckoutSession;
  return session;
}
