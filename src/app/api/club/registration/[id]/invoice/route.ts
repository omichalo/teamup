export const runtime = "nodejs";

import { cookies } from "next/headers";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { adminAuth, getFirestoreAdmin } from "@/lib/firebase-admin";
import { resolveRole } from "@/lib/auth/roles";
import { canAccessClubRegistration } from "@/lib/club-registration/registration-access";
import {
  buildPaymentInvoicePdf,
  buildPaymentInvoiceViewModel,
  ensurePaymentDocumentNumber,
  isInvoiceDocumentAvailable,
} from "@/lib/club-registration/payment-documents";

const COLLECTION = "clubRegistrations";

/**
 * GET /api/club/registration/[id]/invoice
 * Facture PDF TeamUp (détail tarifaire) — admin, secrétariat, ou soumettant.
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;
    if (!sessionCookie) {
      return jsonNoStore({ error: "Authentification requise" }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const role = resolveRole(decoded.role as string | undefined);

    const { id } = await context.params;
    const db = getFirestoreAdmin();
    const snap = await db.collection(COLLECTION).doc(id).get();
    if (!snap.exists) {
      return jsonNoStore({ error: "Dossier introuvable" }, { status: 404 });
    }

    const data = (snap.data() ?? {}) as Record<string, unknown>;
    const submitterUid =
      typeof data.submitterUid === "string" ? data.submitterUid : undefined;

    if (!canAccessClubRegistration(role, submitterUid, decoded.uid)) {
      return jsonNoStore({ error: "Accès refusé" }, { status: 403 });
    }

    if (!isInvoiceDocumentAvailable(data)) {
      return jsonNoStore(
        { error: "La facture n'est pas encore disponible pour ce dossier." },
        { status: 404 }
      );
    }

    const documentNumber = await ensurePaymentDocumentNumber({
      db,
      registrationId: id,
      data,
      kind: "invoice",
    });

    const viewModel = buildPaymentInvoiceViewModel(id, data, { documentNumber });
    if (!viewModel) {
      return jsonNoStore(
        { error: "Impossible de constituer la facture." },
        { status: 404 }
      );
    }

    const pdf = await buildPaymentInvoicePdf(viewModel);
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
    console.error("[api/club/registration/invoice]", error);
    return jsonNoStore(
      { error: "Impossible de générer la facture" },
      { status: 500 }
    );
  }
}
