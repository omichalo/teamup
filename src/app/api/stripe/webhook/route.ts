export const runtime = "nodejs";

import { FieldValue } from "firebase-admin/firestore";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/auth/audit-logger";
import { verifyStripeWebhookSignature } from "@/lib/club-registration/stripe";

type StripeWebhookEvent = {
  id: string;
  type: string;
  data?: {
    object?: {
      id?: string;
      payment_status?: string;
      client_reference_id?: string;
      invoice?: string;
      metadata?: Record<string, string>;
    };
  };
};

export async function POST(req: Request) {
  try {
    const payload = await req.text();
    if (!verifyStripeWebhookSignature(payload, req.headers.get("stripe-signature"))) {
      return jsonNoStore({ error: "Signature Stripe invalide" }, { status: 400 });
    }

    const event = JSON.parse(payload) as StripeWebhookEvent;
    if (event.type !== "checkout.session.completed") {
      return jsonNoStore({ received: true }, { status: 200 });
    }

    const session = event.data?.object;
    const registrationId =
      session?.metadata?.registrationId || session?.client_reference_id || null;
    if (!registrationId) {
      return jsonNoStore({ received: true, ignored: "missing registration id" }, { status: 200 });
    }

    const db = getFirestoreAdmin();
    await db.collection("clubRegistrations").doc(registrationId).set(
      {
        status: "paid",
        paymentStatus: session?.payment_status ?? "paid",
        stripeCheckoutSessionId: session?.id ?? null,
        stripeInvoiceId: session?.invoice ?? null,
        paidAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    logAuditAction(AUDIT_ACTIONS.CLUB_REGISTRATION_PAYMENT_CONFIRMED, "stripe", {
      resource: "clubRegistration",
      resourceId: registrationId,
      details: { eventId: event.id, checkoutSessionId: session?.id },
      success: true,
    });

    return jsonNoStore({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[api/stripe/webhook]", error);
    return jsonNoStore({ error: "Webhook Stripe impossible à traiter" }, { status: 500 });
  }
}
