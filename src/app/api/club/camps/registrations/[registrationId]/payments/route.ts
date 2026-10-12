export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { logAuditAction, AUDIT_ACTIONS } from "@/lib/auth/audit-logger";
import { jsonNoStore } from "@/lib/http/cache-headers";
import {
  invalidOriginResponse,
  parseJsonBody,
  requireCampManager,
} from "@/lib/camps/api-auth";
import { campManualPaymentSchema } from "@/lib/camps/schema";
import { recordCampPayment } from "@/lib/camps/apply-payment";
import { dispatchCampPaymentConfirmedEmail } from "@/lib/camps/camp-payment-email";

type RouteContext = { params: Promise<{ registrationId: string }> };

/** POST — encaissement manuel secrétariat. */
export async function POST(req: NextRequest, context: RouteContext) {
  if (!validateOrigin(req)) return invalidOriginResponse();
  const auth = await requireCampManager();
  if (!auth.ok) return auth.response;

  const { registrationId } = await context.params;
  let json: unknown;
  try {
    json = await parseJsonBody(req);
  } catch {
    return jsonNoStore({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = campManualPaymentSchema.safeParse(json);
  if (!parsed.success) {
    return jsonNoStore(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const registration = await recordCampPayment({
      db: auth.session.db,
      registrationId,
      method: parsed.data.method,
      amountCents: parsed.data.amountCents,
      recordedByUid: auth.session.uid,
      ...(parsed.data.paidAt ? { paidAt: parsed.data.paidAt } : {}),
      ...(parsed.data.reference !== undefined
        ? { reference: parsed.data.reference }
        : {}),
    });

    logAuditAction(AUDIT_ACTIONS.CLUB_CAMP_PAYMENT_RECORDED, auth.session.uid, {
      resource: "campRegistration",
      resourceId: registrationId,
      details: {
        method: parsed.data.method,
        amountCents: parsed.data.amountCents,
        status: registration.status,
      },
      success: true,
    });

    if (registration.status === "paid") {
      try {
        await dispatchCampPaymentConfirmedEmail(registration);
      } catch (emailError) {
        console.error("[api/club/camps/payments] email", emailError);
      }
    }

    return jsonNoStore({ registration });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    const status = message.includes("introuvable")
      ? 404
      : message.includes("annulée")
        ? 400
        : 500;
    if (status === 500) console.error("[api/club/camps/payments]", error);
    return jsonNoStore({ error: message }, { status });
  }
}
