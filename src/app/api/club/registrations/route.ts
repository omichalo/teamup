export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { hasAnyRole, USER_ROLES, type UserRole } from "@/lib/auth/roles";
import { normalizeMedicalCertificateStatus } from "@/lib/club-registration/medical-certificate";
import { withAuth } from "@/lib/auth/api-utils";
import type { DecodedIdToken } from "firebase-admin/auth";

const COLLECTION = "clubRegistrations";
const MANAGER_ROLES = [USER_ROLES.ADMIN, USER_ROLES.SECRETARY] as const;

/** Champs renvoyés en mode "liste" (synthèse, pas la totalité du dossier). */
const LIST_FIELDS = [
  "adherentRole",
  "firstName",
  "lastName",
  "birthDate",
  "isMinor",
  "mainSectionId",
  "medicalCertificateDeclaration",
  "medicalCertificateStatus",
  "status",
  "submitterUid",
  "submitterAccountEmail",
  "paymentAmountCents",
  "paymentStatus",
  "paymentRequestedAt",
  "paidAt",
  "payment",
  "pricingQuote",
] as const;

/** GET /api/club/registrations — liste personnelle ou, avec scope=managed, liste à traiter. */
export const GET = withAuth(
  async (req: Request, context: unknown) => {
    try {
      const { decoded, role } = context as {
        decoded: DecodedIdToken;
        role: UserRole;
      };

      const db = getFirestoreAdmin();
      const url = new URL(req.url);
      const managedScope = url.searchParams.get("scope") === "managed";
      const isManager = hasAnyRole(role, MANAGER_ROLES);
      if (managedScope && !isManager) {
        return jsonNoStore({ error: "Access denied" }, { status: 403 });
      }

    /* Tri en mémoire (un soumettant a typiquement <10 dossiers, on évite ainsi
       la dépendance à l'index composite `submitterUid + submittedAt desc`
       déclaré dans firestore.indexes.json mais qui peut ne pas être encore
       déployé sur l'environnement courant). Limite serveur volontairement
       plus large que la limite finale pour conserver les plus récents même
       en cas de borderline. */
    const snap = managedScope
      ? await db.collection(COLLECTION).limit(200).get()
      : await db
          .collection(COLLECTION)
          .where("submitterUid", "==", decoded.uid)
          .limit(50)
          .get();

    const registrations = snap.docs
      .map((doc) => {
        const data = doc.data();
        const summary: Record<string, unknown> = { id: doc.id };
        for (const key of LIST_FIELDS) {
          if (data[key] !== undefined) {
            summary[key] = data[key];
          }
        }
        summary.medicalCertificateStatus = normalizeMedicalCertificateStatus(
          data.medicalCertificateStatus,
          data.medicalCertificateDeclaration
        );
        const submittedAtMs: number = data.submittedAt?.toMillis?.() ?? 0;
        summary.submittedAt =
          data.submittedAt?.toDate?.()?.toISOString?.() ?? null;
        summary.updatedAt = data.updatedAt?.toDate?.()?.toISOString?.() ?? null;
        summary.paymentRequestedAt =
          data.paymentRequestedAt?.toDate?.()?.toISOString?.() ?? null;
        summary.paidAt = data.paidAt?.toDate?.()?.toISOString?.() ?? null;
        summary.invoiceAvailable =
          typeof data.stripeInvoiceId === "string" && data.stripeInvoiceId.length > 0;
        return { summary, submittedAtMs };
      })
      .sort((a, b) => b.submittedAtMs - a.submittedAtMs)
      .slice(0, 20)
      .map((entry) => entry.summary);

    return jsonNoStore({ registrations }, { status: 200 });
  } catch (error) {
    console.error("[api/club/registrations GET]", error);
    return jsonNoStore(
      { error: "Impossible de charger les dossiers" },
      { status: 500 }
    );
  }
},
[USER_ROLES.PLAYER, USER_ROLES.SECRETARY, USER_ROLES.COACH, USER_ROLES.ADMIN]);
