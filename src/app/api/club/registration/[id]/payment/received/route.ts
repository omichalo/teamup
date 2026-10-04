export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/auth/audit-logger";
import { requireRegistrationManager } from "@/lib/club-registration/payment/api-auth";
import { isReceivedMethodIdSafe } from "@/lib/club-registration/payment/normalize-payment";
import { addManualReceivedPayment } from "@/lib/club-registration/payment/payment-mutations";
import { normalizePaymentReference } from "@/lib/club-registration/payment/payment-reference";
import { classifyOtherReceivedMethod } from "@/lib/accounting-export/chart";
import { commitRegistrationPaymentMutation } from "@/lib/club-registration/payment-documents/commit-registration-payment";
import { syncPaymentDocumentNumbersForRegistration } from "@/lib/club-registration/payment-documents/sync-document-numbers";
import type { ReceivedPaymentMethodId } from "@/lib/club-registration/payment-constants";

function resolveReceivedMethod(params: {
  method: ReceivedPaymentMethodId;
  label?: string | null;
  note?: string | null;
}):
  | { ok: true; method: ReceivedPaymentMethodId }
  | { ok: false; error: string } {
  if (params.method !== "other") {
    return { ok: true, method: params.method };
  }

  const classified = classifyOtherReceivedMethod({
    label: params.label ?? null,
    note: params.note ?? null,
  });
  if (classified === "non_settlement") {
    return {
      ok: false,
      error:
        "Cette ligne ressemble à une remise / trop-perçu. Utilisez la remise exceptionnelle du dossier (avoir AVO), pas un encaissement.",
    };
  }
  if (classified === "sumup" || classified === "transfer") {
    return { ok: true, method: classified };
  }
  return { ok: true, method: params.method };
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!validateOrigin(req)) {
      return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
    }

    const auth = await requireRegistrationManager();
    if (!auth.ok) {
      return jsonNoStore({ error: auth.error }, { status: auth.status });
    }

    const { id } = await context.params;
    const body = ((await req.json().catch(() => ({}))) ?? {}) as {
      method?: string;
      label?: string;
      amountCents?: number;
      receivedAt?: string;
      note?: string;
      reference?: string;
    };

    if (!isReceivedMethodIdSafe(body.method)) {
      return jsonNoStore({ error: "Moyen de paiement invalide" }, { status: 400 });
    }
    if (!Number.isInteger(body.amountCents) || (body.amountCents as number) <= 0) {
      return jsonNoStore({ error: "Montant invalide" }, { status: 400 });
    }

    const resolvedMethod = resolveReceivedMethod({
      method: body.method,
      ...(typeof body.label === "string" ? { label: body.label } : {}),
      ...(typeof body.note === "string" ? { note: body.note } : {}),
    });
    if (!resolvedMethod.ok) {
      return jsonNoStore({ error: resolvedMethod.error }, { status: 400 });
    }

    const receivedAt =
      typeof body.receivedAt === "string" && body.receivedAt
        ? body.receivedAt
        : new Date().toISOString();

    const reference = normalizePaymentReference(body.reference);
    const db = getFirestoreAdmin();

    const committed = await commitRegistrationPaymentMutation({
      db,
      registrationId: id,
      mutate: (payment) =>
        addManualReceivedPayment(payment, {
          method: resolvedMethod.method,
          label: body.label ?? "",
          amountCents: body.amountCents as number,
          receivedAt,
          recordedBy: auth.uid,
          ...(reference ? { reference } : {}),
          ...(typeof body.note === "string" && body.note.trim()
            ? { note: body.note.trim() }
            : {}),
        }),
    });

    if (!committed.ok) {
      return jsonNoStore({ error: committed.error }, { status: committed.status });
    }

    try {
      await syncPaymentDocumentNumbersForRegistration(db, id);
    } catch (numberError) {
      console.error(
        "[api/club/registration/payment/received] document numbers",
        numberError
      );
    }

    logAuditAction(AUDIT_ACTIONS.CLUB_REGISTRATION_UPDATED, auth.uid, {
      resource: "clubRegistration",
      resourceId: id,
      details: { action: "payment_received_manual" },
      success: true,
    });

    return jsonNoStore({ payment: committed.payment }, { status: 200 });
  } catch (error) {
    console.error("[api/club/registration/payment/received POST]", error);
    return jsonNoStore({ error: "Impossible d'enregistrer le paiement" }, { status: 500 });
  }
}
