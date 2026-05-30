export const runtime = "nodejs";

import { cookies } from "next/headers";
import { jsonNoStore } from "@/lib/http/cache-headers";
import { adminAuth, getFirestoreAdmin } from "@/lib/firebase-admin";
import { resolveRole } from "@/lib/auth/roles";
import { canAccessClubRegistration } from "@/lib/club-registration/registration-access";
import {
  pickInvoiceDownloadUrl,
  retrieveStripeInvoiceLinks,
} from "@/lib/club-registration/stripe";

const COLLECTION = "clubRegistrations";

/**
 * GET /api/club/registration/[id]/invoice
 * Facture Stripe : admin, secrétariat, ou soumettant du dossier uniquement.
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

    const data = snap.data() ?? {};
    const submitterUid =
      typeof data.submitterUid === "string" ? data.submitterUid : undefined;

    if (!canAccessClubRegistration(role, submitterUid, decoded.uid)) {
      return jsonNoStore({ error: "Accès refusé" }, { status: 403 });
    }

    const invoiceId =
      typeof data.stripeInvoiceId === "string" ? data.stripeInvoiceId : null;
    if (!invoiceId) {
      return jsonNoStore(
        {
          error:
            "Aucune facture n’est encore disponible pour ce dossier. Réessayez dans quelques minutes ou contactez le secrétariat.",
        },
        { status: 404 }
      );
    }

    const isPaid =
      data.status === "paid" ||
      data.paymentStatus === "paid" ||
      data.paymentStatus === "complete";
    if (!isPaid) {
      return jsonNoStore(
        { error: "La facture est disponible après confirmation du paiement." },
        { status: 403 }
      );
    }

    const links = await retrieveStripeInvoiceLinks(invoiceId);
    const url = pickInvoiceDownloadUrl(links);
    if (!url) {
      return jsonNoStore(
        { error: "Stripe n’a pas encore publié le lien de facture." },
        { status: 502 }
      );
    }

    return jsonNoStore(
      {
        url,
        format: links.invoicePdf ? "pdf" : "hosted",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[api/club/registration/invoice]", error);
    return jsonNoStore(
      { error: "Impossible de récupérer la facture" },
      { status: 500 }
    );
  }
}
