export const runtime = "nodejs";

import { cookies } from "next/headers";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { adminAuth, getFirestoreAdmin } from "@/lib/firebase-admin";
import { resolveRole } from "@/lib/auth/roles";
import { canAccessClubRegistration } from "@/lib/club-registration/registration-access";
import {
  buildAccountingInvoiceViewModel,
  buildPaymentInvoicePdf,
  ensureInitialAccountingInvoiceSnapshot,
  isInvoiceDocumentAvailable,
  parseAccountingInvoices,
} from "@/lib/club-registration/payment-documents";

const COLLECTION = "clubRegistrations";

/**
 * GET /api/club/registration/[id]/invoice/[invoiceId]
 * PDF d'une pièce FAC / FAC complémentaire / avoir figée.
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string; invoiceId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;
    if (!sessionCookie) {
      return jsonNoStore({ error: "Authentification requise" }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const role = resolveRole(decoded.role as string | undefined);

    const { id, invoiceId } = await context.params;
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

    if (!isInvoiceDocumentAvailable(data)) {
      return jsonNoStore(
        { error: "Aucune facture disponible pour ce dossier." },
        { status: 404 }
      );
    }

    const invoices = await ensureInitialAccountingInvoiceSnapshot({
      db,
      registrationId: id,
      data,
    });
    data = {
      ...data,
      accountingInvoices: invoices.length > 0 ? invoices : parseAccountingInvoices(data),
    };

    const invoice =
      invoices.find((doc) => doc.id === invoiceId) ??
      parseAccountingInvoices(data).find((doc) => doc.id === invoiceId);
    if (!invoice) {
      return jsonNoStore({ error: "Pièce introuvable" }, { status: 404 });
    }

    const viewModel = buildAccountingInvoiceViewModel(id, data, invoice);
    const pdf = await buildPaymentInvoicePdf(viewModel);
    const fileName = `${invoice.documentNumber}.pdf`;

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
    console.error("[api/club/registration/invoice/[invoiceId]]", error);
    return jsonNoStore(
      { error: "Impossible de générer la facture" },
      { status: 500 }
    );
  }
}
