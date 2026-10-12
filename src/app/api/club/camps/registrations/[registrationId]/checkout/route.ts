export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { canViewCampRegistration } from "@/lib/camps/access";
import {
  invalidOriginResponse,
  requireAuthenticatedUser,
} from "@/lib/camps/api-auth";
import { getCamp, getCampRegistration, updateCampRegistration } from "@/lib/camps/store";
import { createCampCheckoutSession, getAppBaseUrl } from "@/lib/camps/stripe";
import { ensureCampInvoiceNumber } from "@/lib/camps/apply-payment";

type RouteContext = { params: Promise<{ registrationId: string }> };

/** POST — crée une session Stripe Checkout pour une inscription stage. */
export async function POST(req: NextRequest, context: RouteContext) {
  if (!validateOrigin(req)) return invalidOriginResponse();
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth.response;

  const { registrationId } = await context.params;
  try {
    const registration = await getCampRegistration(auth.session.db, registrationId);
    if (!registration) {
      return jsonNoStore({ error: "Inscription introuvable" }, { status: 404 });
    }
    if (
      !canViewCampRegistration(
        auth.session.role,
        registration.ownerUid,
        auth.session.uid
      )
    ) {
      return jsonNoStore({ error: "Accès refusé" }, { status: 403 });
    }
    if (registration.status === "paid" || registration.status === "cancelled") {
      return jsonNoStore({ error: "Paiement non nécessaire" }, { status: 400 });
    }

    const camp = await getCamp(auth.session.db, registration.campId);
    if (!camp) {
      return jsonNoStore({ error: "Stage introuvable" }, { status: 404 });
    }

    await ensureCampInvoiceNumber(auth.session.db, registration);

    const base = getAppBaseUrl(req);
    const session = await createCampCheckoutSession({
      registration,
      campTitle: camp.title,
      successUrl: `${base}/club/mes-stages?paid=1`,
      cancelUrl: `${base}/club/mes-stages?cancelled=1`,
    });

    if (!session.url) {
      return jsonNoStore({ error: "Stripe n’a pas renvoyé d’URL" }, { status: 502 });
    }

    await updateCampRegistration(auth.session.db, registrationId, {
      "payment.stripeCheckoutSessionId": session.id,
      "payment.stripeCheckoutUrl": session.url,
      "payment.chosenMethod": "card",
    });

    return jsonNoStore({ checkoutUrl: session.url, checkoutSessionId: session.id });
  } catch (error) {
    console.error("[api/club/camps/checkout]", error);
    return jsonNoStore(
      { error: "Paiement en ligne indisponible" },
      { status: 500 }
    );
  }
}
