export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { AUDIT_ACTIONS, logAuditAction } from "@/lib/auth/audit-logger";
import { requireRegistrationManager } from "@/lib/club-registration/payment/api-auth";
import {
  isReceivedMethodIdSafe,
  normalizeRegistrationPayment,
} from "@/lib/club-registration/payment/normalize-payment";
import { dispatchPaymentConfirmedEmail } from "@/lib/email/dispatch-payment-confirmed-email";
import { markPaymentFullyPaid } from "@/lib/club-registration/payment/payment-mutations";
import { shouldMarkRegistrationPaid } from "@/lib/club-registration/payment/settlement-firestore";
import { commitRegistrationPaymentMutation } from "@/lib/club-registration/payment-documents/commit-registration-payment";
import { syncPaymentDocumentNumbersForRegistration } from "@/lib/club-registration/payment-documents/sync-document-numbers";

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
      note?: string;
      method?: string;
    };

    if (!isReceivedMethodIdSafe(body.method)) {
      return jsonNoStore(
        { error: "Indiquez le moyen d'encaissement réellement reçu." },
        { status: 400 }
      );
    }

    const db = getFirestoreAdmin();
    const committed = await commitRegistrationPaymentMutation({
      db,
      registrationId: id,
      mutate: (payment) => {
        if (!isReceivedMethodIdSafe(body.method)) {
          return {
            error: "Indiquez le moyen d'encaissement réellement reçu.",
            status: 400 as const,
          };
        }
        const next = markPaymentFullyPaid(payment, {
          method: body.method,
          recordedBy: auth.uid,
          ...(typeof body.note === "string" && body.note.trim()
            ? { note: body.note.trim() }
            : {}),
        });
        if (!shouldMarkRegistrationPaid(next)) {
          return {
            error: "Impossible de marquer soldé : un solde reste dû.",
            status: 409 as const,
          };
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
        "[api/club/registration/payment/mark-paid] document numbers",
        numberError
      );
    }

    const priorPayment = normalizeRegistrationPayment(committed.data);
    const alreadyPaid =
      committed.data.status === "paid" || priorPayment?.paymentStatus === "paid";

    logAuditAction(AUDIT_ACTIONS.CLUB_REGISTRATION_UPDATED, auth.uid, {
      resource: "clubRegistration",
      resourceId: id,
      details: { action: "payment_mark_paid" },
      success: true,
    });

    if (!alreadyPaid && committed.payment.paidAmountCents > 0) {
      try {
        await dispatchPaymentConfirmedEmail({
          registrationId: id,
          data: committed.data,
          amountCents: committed.payment.paidAmountCents,
          source: "secretariat",
          req,
        });
      } catch (emailError) {
        console.error("[api/club/registration/payment/mark-paid] confirmation email", emailError);
      }
    }

    return jsonNoStore({ payment: committed.payment }, { status: 200 });
  } catch (error) {
    console.error("[api/club/registration/payment/mark-paid POST]", error);
    return jsonNoStore({ error: "Impossible de marquer comme payé" }, { status: 500 });
  }
}
