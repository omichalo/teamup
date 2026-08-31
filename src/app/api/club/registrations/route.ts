export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { cookies } from "next/headers";
import { getFirestoreAdmin, adminAuth } from "@/lib/firebase-admin";
import { ALL_USER_ROLES, hasAnyRole, USER_ROLES, resolveRole } from "@/lib/auth/roles";
import {
  listManagedRegistrations,
  listPersonalRegistrations,
  MANAGED_PAGE_SIZE_DEFAULT,
  MANAGED_PAGE_SIZE_MAX,
} from "@/lib/club-registration/list-registrations";
import { resolveManagedListStatusFilter } from "@/lib/club-registration/registration-status";
import { resolveManagedListMedicalCertificateFilter } from "@/lib/club-registration/medical-certificate";
import { resolveManagedListPpsFollowUpFilter } from "@/lib/club-registration/pps-follow-up";
import { resolveManagedListCriteriumFederalFilter } from "@/lib/club-registration/criterium-federal-follow-up";
import { resolveManagedListJerseyFollowUpFilter } from "@/lib/club-registration/jersey-follow-up";
import { resolveManagedListRegistrationCertificateFollowUpFilter } from "@/lib/club-registration/registration-certificate-follow-up";
import { resolveManagedListAidReceiptFilter } from "@/lib/club-registration/payment/aid-receipt";
import { resolveManagedListPaymentSupplementFilter } from "@/lib/club-registration/payment/supplement-managed-filter";

const MANAGER_ROLES = [USER_ROLES.ADMIN, USER_ROLES.SECRETARY] as const;

/** GET /api/club/registrations — liste personnelle ou, avec scope=managed, liste secrétariat. */
export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;
    if (!sessionCookie) {
      return jsonNoStore({ error: "Authentification requise" }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const role = resolveRole(decoded.role as string | undefined);
    if (!hasAnyRole(role, ALL_USER_ROLES)) {
      return jsonNoStore({ error: "Accès refusé" }, { status: 403 });
    }

    const db = getFirestoreAdmin();
    const url = new URL(req.url);
    const managedScope = url.searchParams.get("scope") === "managed";
    const isManager = hasAnyRole(role, MANAGER_ROLES);
    if (managedScope && !isManager) {
      return jsonNoStore({ error: "Accès refusé" }, { status: 403 });
    }

    if (managedScope) {
      const statusFilter = resolveManagedListStatusFilter(url.searchParams.get("status"));
      const medicalCertificateFilter = resolveManagedListMedicalCertificateFilter(
        url.searchParams.get("medicalCertificate")
      );
      const ppsFollowUpFilter = resolveManagedListPpsFollowUpFilter(
        url.searchParams.get("ppsFollowUp")
      );
      const criteriumFederalFilter = resolveManagedListCriteriumFederalFilter(
        url.searchParams.get("criteriumFederal")
      );
      const jerseyFollowUpFilter = resolveManagedListJerseyFollowUpFilter(
        url.searchParams.get("jerseyFollowUp")
      );
      const registrationCertificateFollowUpFilter =
        resolveManagedListRegistrationCertificateFollowUpFilter(
          url.searchParams.get("registrationCertificateFollowUp")
        );
      const aidReceiptFilter = resolveManagedListAidReceiptFilter(
        url.searchParams.get("aidReceipt")
      );
      const paymentSupplementFilter = resolveManagedListPaymentSupplementFilter(
        url.searchParams.get("paymentSupplement")
      );
      const rawLimit = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
      const pageSize = Number.isFinite(rawLimit)
        ? Math.min(Math.max(rawLimit, 1), MANAGED_PAGE_SIZE_MAX)
        : MANAGED_PAGE_SIZE_DEFAULT;
      const cursor = url.searchParams.get("cursor");
      const searchQuery = url.searchParams.get("q");

      const page = await listManagedRegistrations(db, {
        statusFilter,
        medicalCertificateFilter,
        ppsFollowUpFilter,
        criteriumFederalFilter,
        jerseyFollowUpFilter,
        registrationCertificateFollowUpFilter,
        aidReceiptFilter,
        paymentSupplementFilter,
        pageSize,
        cursor,
        searchQuery,
      });

      return jsonNoStore(
        {
          registrations: page.registrations,
          pageInfo: {
            hasNextPage: page.hasNextPage,
            nextCursor: page.nextCursor,
            searchMode: page.searchMode,
            totalMatched: page.totalMatched ?? null,
          },
        },
        { status: 200 }
      );
    }

    /* Tri en mémoire (un soumettant a typiquement <10 dossiers, on évite ainsi
       la dépendance à l'index composite `submitterUid + submittedAt desc`
       déclaré dans firestore.indexes.json mais qui peut ne pas être encore
       déployé sur l'environnement courant). */
    const { registrations } = await listPersonalRegistrations(db, decoded.uid);

    return jsonNoStore({ registrations }, { status: 200 });
  } catch (error) {
    console.error("[api/club/registrations GET]", error);
    return jsonNoStore({ error: "Impossible de charger les dossiers" }, { status: 500 });
  }
}
