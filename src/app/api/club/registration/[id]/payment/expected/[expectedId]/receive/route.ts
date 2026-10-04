export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/auth/audit-logger";
import { requireRegistrationManager } from "@/lib/club-registration/payment/api-auth";
import { markExpectedPaymentReceived } from "@/lib/club-registration/payment/payment-mutations";
import { normalizePaymentReference } from "@/lib/club-registration/payment/payment-reference";
import { commitRegistrationPaymentMutation } from "@/lib/club-registration/payment-documents/commit-registration-payment";
import { syncPaymentDocumentNumbersForRegistration } from "@/lib/club-registration/payment-documents/sync-document-numbers";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string; expectedId: string }> }
) {
  try {
    if (!validateOrigin(req)) {
      return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
    }

    const auth = await requireRegistrationManager();
    if (!auth.ok) {
      return jsonNoStore({ error: auth.error }, { status: auth.status });
    }

    const { id, expectedId } = await context.params;
    const body = ((await req.json().catch(() => ({}))) ?? {}) as {
      amountCents?: number;
      receivedAt?: string;
      note?: string;
      reference?: string;
    };

    const receivedAt =
      typeof body.receivedAt === "string" && body.receivedAt
        ? body.receivedAt
        : new Date().toISOString();
    const reference = normalizePaymentReference(body.reference);
    const db = getFirestoreAdmin();

    const committed = await commitRegistrationPaymentMutation({
      db,
      registrationId: id,
      mutate: (payment) => {
        const expected = payment.expectedPayments.find((e) => e.id === expectedId);
        if (!expected) {
          return { error: "Échéance introuvable", status: 404 as const };
        }
        const amountCents =
          Number.isInteger(body.amountCents) && (body.amountCents as number) > 0
            ? (body.amountCents as number)
            : expected.expectedAmountCents;

        const next = markExpectedPaymentReceived(payment, expectedId, {
          amountCents,
          receivedAt,
          recordedBy: auth.uid,
          ...(reference ? { reference } : {}),
          ...(typeof body.note === "string" && body.note.trim()
            ? { note: body.note.trim() }
            : {}),
        });
        if (!next) {
          return { error: "Impossible de marquer cette échéance" };
        }
        return next;
      },
    });

    if (!committed.ok) {
      return jsonNoStore({ error: committed.error }, { status: committed.status });
    }

    try {
      await syncPaymentDocumentNumbersForRegistration(db, id);
    } catch (numberError) {
      console.error(
        "[api/club/registration/payment/expected/receive] document numbers",
        numberError
      );
    }

    logAuditAction(AUDIT_ACTIONS.CLUB_REGISTRATION_UPDATED, auth.uid, {
      resource: "clubRegistration",
      resourceId: id,
      details: { action: "expected_payment_received", expectedId },
      success: true,
    });

    return jsonNoStore({ payment: committed.payment }, { status: 200 });
  } catch (error) {
    console.error("[api/club/registration/payment/expected/receive POST]", error);
    return jsonNoStore(
      { error: "Impossible d'enregistrer la réception de l'échéance" },
      { status: 500 }
    );
  }
}
