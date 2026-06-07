export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { canAccessClubRegistration } from "@/lib/club-registration/registration-access";
import {
  pickInvoiceDownloadUrl,
  retrieveStripeInvoiceLinks,
} from "@/lib/club-registration/stripe";
import { withAuth } from "@/lib/auth/api-utils";
import type { DecodedIdToken } from "firebase-admin/auth";
import type { UserRole } from "@/lib/auth/roles";

const COLLECTION = "clubRegistrations";

/**
 * GET /api/club/registration/[id]/invoice
 * Facture Stripe : admin, secrétariat, ou soumettant du dossier uniquement.
 */
export const GET = withAuth(async (_req, context) => {
  try {
    const { params, decoded, role } = context as {
      params: Promise<{ id: string }>;
      decoded: DecodedIdToken;
      role: UserRole;
    };

    const { id } = await params;
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
});
