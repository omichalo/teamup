export const runtime = "nodejs";

import { cookies } from "next/headers";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { adminAuth, getFirestoreAdmin } from "@/lib/firebase-admin";
import { resolveRole } from "@/lib/auth/roles";
import { canAccessClubRegistration } from "@/lib/club-registration/registration-access";
import { getRegistrationPaymentAids } from "@/lib/club-registration/payment/aid-receipt";
import {
  buildPaymentAidReceiptPdf,
  buildPaymentAidReceiptViewModel,
  ensureReceivedAidDocumentNumbers,
  isReceivedCollectableAid,
} from "@/lib/club-registration/payment-documents";

const COLLECTION = "clubRegistrations";

/**
 * GET /api/club/registration/[id]/aid-receipt/[aidType]
 * Justificatif PDF d'une aide reçue (pièce AID).
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string; aidType: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;
    if (!sessionCookie) {
      return jsonNoStore({ error: "Authentification requise" }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const role = resolveRole(decoded.role as string | undefined);

    const { id, aidType } = await context.params;
    const decodedAidType = decodeURIComponent(aidType);
    const db = getFirestoreAdmin();
    const snap = await db.collection(COLLECTION).doc(id).get();
    if (!snap.exists) {
      return jsonNoStore({ error: "Dossier introuvable" }, { status: 404 });
    }

    let data = (snap.data() ?? {}) as Record<string, unknown>;
    const submitterUid =
      typeof data.submitterUid === "string" ? data.submitterUid : undefined;

    if (!canAccessClubRegistration(role, submitterUid, decoded.uid)) {
      return jsonNoStore({ error: "Accès refusé" }, { status: 403 });
    }

    const ensured = await ensureReceivedAidDocumentNumbers({
      db,
      registrationId: id,
      data,
    });
    if (ensured.paymentAids) {
      data = { ...data, paymentAids: ensured.paymentAids };
    }
    if (ensured.payment) {
      data = { ...data, payment: ensured.payment };
    }

    const aid = getRegistrationPaymentAids(data).find(
      (item) => item.type === decodedAidType && isReceivedCollectableAid(item)
    );
    if (!aid) {
      return jsonNoStore({ error: "Aide reçue introuvable" }, { status: 404 });
    }

    const documentNumber = aid.documentNumber?.trim();
    if (!documentNumber) {
      return jsonNoStore(
        { error: "Numéro de pièce indisponible pour cette aide." },
        { status: 500 }
      );
    }

    const viewModel = buildPaymentAidReceiptViewModel(id, data, aid, {
      documentNumber,
    });
    if (!viewModel) {
      return jsonNoStore(
        { error: "Impossible de constituer le justificatif d'aide." },
        { status: 404 }
      );
    }

    const pdf = await buildPaymentAidReceiptPdf(viewModel);
    const fileName = `${documentNumber}.pdf`;

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("[api/club/registration/aid-receipt/[aidType]]", error);
    return jsonNoStore(
      { error: "Impossible de générer le justificatif d'aide" },
      { status: 500 }
    );
  }
}
