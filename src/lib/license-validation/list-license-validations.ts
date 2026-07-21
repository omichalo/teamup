import type { Firestore, Query } from "firebase-admin/firestore";
import { COLLECTION } from "@/lib/club-registration/list-registrations";
import {
  mapRegistrationToLicenseValidationListItem,
  type LicenseValidationListItem,
} from "@/lib/license-validation/map-registration";
import {
  resolveLicenseValidationListFilter,
  type LicenseValidationListFilter,
} from "@/lib/license-validation/license-validation-status";
import { registrationMatchesLicenseValidationSearch } from "@/lib/license-validation/search-registrations";

export const LICENSE_VALIDATION_PAGE_SIZE_DEFAULT = 25;
export const LICENSE_VALIDATION_PAGE_SIZE_MAX = 50;
export const LICENSE_VALIDATION_SCAN_LIMIT = 500;

const SUBMITTED_STATUSES = ["submitted", "in_review", "payment_requested", "paid", "approved"];

export type LicenseValidationPage = {
  registrations: LicenseValidationListItem[];
  hasNextPage: boolean;
  nextCursor: string | null;
};

/**
 * Firestore `==` ignore les docs sans le champ. Or les dossiers créés avant
 * l’introduction de `licenseValidationStatus` n’ont pas ce champ : ils doivent
 * compter comme `to_do` (voir `normalizeLicenseValidationStatus`).
 * On ne pousse donc le filtre Firestore que pour les statuts explicitement
 * renseignés (`done`, `other_federation`).
 */
function canFilterLicenseStatusInFirestore(
  statusFilter: LicenseValidationListFilter
): boolean {
  return statusFilter === "done" || statusFilter === "other_federation";
}

function applyLicenseValidationStatusFilter(
  query: Query,
  statusFilter: LicenseValidationListFilter
): Query {
  if (!canFilterLicenseStatusInFirestore(statusFilter)) {
    return query;
  }
  return query.where("licenseValidationStatus", "==", statusFilter);
}

function matchesSubmittedStatus(status: string | null): boolean {
  return typeof status === "string" && SUBMITTED_STATUSES.includes(status);
}

export function matchesLicenseStatusFilter(
  item: LicenseValidationListItem,
  statusFilter: LicenseValidationListFilter
): boolean {
  if (statusFilter === "all") {
    return true;
  }
  return item.licenseValidationStatus === statusFilter;
}

async function fetchLicenseValidationSummaries(
  db: Firestore,
  statusFilter: LicenseValidationListFilter,
  limit: number
): Promise<LicenseValidationListItem[]> {
  try {
    let query = db.collection(COLLECTION).orderBy("submittedAt", "desc").limit(limit);
    query = applyLicenseValidationStatusFilter(query, statusFilter);
    const snap = await query.get();
    return snap.docs
      .map((doc) => mapRegistrationToLicenseValidationListItem(doc))
      .filter((item) => matchesSubmittedStatus(item.status));
  } catch {
    const snap = await db.collection(COLLECTION).limit(limit).get();
    return snap.docs
      .map((doc) => mapRegistrationToLicenseValidationListItem(doc))
      .filter(
        (item) =>
          matchesSubmittedStatus(item.status) &&
          matchesLicenseStatusFilter(item, statusFilter)
      )
      .sort((a, b) => {
        const aMs = a.submittedAt ? Date.parse(a.submittedAt) : 0;
        const bMs = b.submittedAt ? Date.parse(b.submittedAt) : 0;
        return bMs - aMs;
      });
  }
}

export async function listLicenseValidations(
  db: Firestore,
  params: {
    statusFilter: LicenseValidationListFilter;
    pageSize: number;
    cursor?: string | null;
    searchQuery?: string | null;
  }
): Promise<LicenseValidationPage> {
  const pageSize = Math.min(
    Math.max(params.pageSize, 1),
    LICENSE_VALIDATION_PAGE_SIZE_MAX
  );
  const searchQuery = params.searchQuery?.trim() ?? "";

  const summaries = await fetchLicenseValidationSummaries(
    db,
    params.statusFilter,
    LICENSE_VALIDATION_SCAN_LIMIT
  );

  const filtered = summaries.filter(
    (item) =>
      matchesLicenseStatusFilter(item, params.statusFilter) &&
      registrationMatchesLicenseValidationSearch(item, searchQuery)
  );

  const startIndex = params.cursor
    ? Math.max(
        filtered.findIndex((item) => item.id === params.cursor) + 1,
        0
      )
    : 0;
  const page = filtered.slice(startIndex, startIndex + pageSize);
  const nextOffset = startIndex + pageSize;

  return {
    registrations: page,
    hasNextPage: nextOffset < filtered.length,
    nextCursor:
      nextOffset < filtered.length && page.length > 0
        ? page[page.length - 1]!.id
        : null,
  };
}

export async function searchLicenseValidations(
  db: Firestore,
  rawQuery: string,
  limit = 10
): Promise<LicenseValidationListItem[]> {
  const query = rawQuery.trim();
  if (query.length < 2) {
    return [];
  }

  const summaries = await fetchLicenseValidationSummaries(db, "all", LICENSE_VALIDATION_SCAN_LIMIT);
  return summaries
    .filter((item) => registrationMatchesLicenseValidationSearch(item, query))
    .slice(0, limit);
}

export { resolveLicenseValidationListFilter };
