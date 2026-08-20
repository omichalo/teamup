import type { Firestore, Query, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { normalizeMedicalCertificateStatus } from "@/lib/club-registration/medical-certificate";
import { normalizePpsFollowUpStatus } from "@/lib/club-registration/pps-follow-up";
import { normalizeCriteriumFederalRegistrationStatus } from "@/lib/club-registration/criterium-federal-follow-up";
import { normalizeJerseyFollowUpStatus } from "@/lib/club-registration/jersey-follow-up";
import { normalizeRegistrationCertificateFollowUpStatus } from "@/lib/club-registration/registration-certificate-follow-up";
import { hasPaymentProofAvailable } from "@/lib/club-registration/payment-proof";
import {
  ACTIONABLE_REGISTRATION_STATUSES,
  type ManagedListStatusFilter,
} from "@/lib/club-registration/registration-status";
import {
  filterManagedSummaries,
  matchesManagedStatusFilter,
  needsClientSideFiltering,
  type ListManagedRegistrationsParams,
} from "@/lib/club-registration/filter-managed-summaries";
import {
  summarizeManagedQueue,
  type ManagedQueueSummary,
} from "@/lib/club-registration/managed-queue-summary";

export const COLLECTION = "clubRegistrations";

/** Champs renvoyés en mode « liste » (synthèse, pas la totalité du dossier). */
export const LIST_FIELDS = [
  "adherentRole",
  "firstName",
  "lastName",
  "birthDate",
  "isMinor",
  "mainSectionId",
  "adherentEmail",
  "medicalCertificateDeclaration",
  "medicalCertificateStatus",
  "ppsFollowUpStatus",
  "criteriumFederalRegistrationStatus",
  "jerseyFollowUpStatus",
  "wantsRegistrationCertificate",
  "registrationCertificateFollowUpStatus",
  "competitionIds",
  "wantsCompetitorExtras",
  "wantsOptionalJersey",
  "status",
  "submitterUid",
  "submitterAccountEmail",
  "paymentAmountCents",
  "paymentStatus",
  "paymentRequestedAt",
  "paidAt",
  "payment",
  "paymentAids",
  "pricingQuote",
] as const;

export type RegistrationListSummary = Record<string, unknown> & { id: string };

export const MANAGED_PAGE_SIZE_DEFAULT = 25;
export const MANAGED_PAGE_SIZE_MAX = 50;
/** Nombre maximal de dossiers parcourus pour une recherche texte côté serveur. */
export const SEARCH_SCAN_LIMIT = 500;
/** Repli sans index composite Firestore (tri + filtre en mémoire). */
export const MANAGED_IN_MEMORY_SCAN_LIMIT = 500;

const SEARCH_CURSOR_PREFIX = "search:";

export function mapRegistrationDocToSummary(
  doc: QueryDocumentSnapshot
): { summary: RegistrationListSummary; submittedAtMs: number } {
  const data = doc.data();
  const summary: RegistrationListSummary = { id: doc.id };
  for (const key of LIST_FIELDS) {
    if (data[key] !== undefined) {
      summary[key] = data[key];
    }
  }
  summary.medicalCertificateStatus = normalizeMedicalCertificateStatus(
    data.medicalCertificateStatus,
    data.medicalCertificateDeclaration
  );
  summary.ppsFollowUpStatus = normalizePpsFollowUpStatus(
    data.ppsFollowUpStatus,
    typeof data.medicalCertificateDeclaration === "string"
      ? data.medicalCertificateDeclaration
      : undefined,
    typeof data.birthDate === "string" ? data.birthDate : undefined
  );
  summary.criteriumFederalRegistrationStatus =
    normalizeCriteriumFederalRegistrationStatus(
      data.criteriumFederalRegistrationStatus,
      Array.isArray(data.competitionIds) ? data.competitionIds : []
    );
  summary.jerseyFollowUpStatus = normalizeJerseyFollowUpStatus(
    data.jerseyFollowUpStatus,
    data.wantsCompetitorExtras,
    data.wantsOptionalJersey
  );
  summary.registrationCertificateFollowUpStatus =
    normalizeRegistrationCertificateFollowUpStatus(
      data.registrationCertificateFollowUpStatus,
      data.wantsRegistrationCertificate
    );
  const submittedAtMs: number = data.submittedAt?.toMillis?.() ?? 0;
  summary.submittedAt = data.submittedAt?.toDate?.()?.toISOString?.() ?? null;
  summary.updatedAt = data.updatedAt?.toDate?.()?.toISOString?.() ?? null;
  summary.paymentRequestedAt =
    data.paymentRequestedAt?.toDate?.()?.toISOString?.() ?? null;
  summary.paidAt = data.paidAt?.toDate?.()?.toISOString?.() ?? null;
  summary.invoiceAvailable = hasPaymentProofAvailable(data);
  return { summary, submittedAtMs };
}

export { registrationMatchesSearch } from "@/lib/club-registration/filter-managed-summaries";
export { matchesManagedStatusFilter };
export type { ListManagedRegistrationsParams } from "@/lib/club-registration/filter-managed-summaries";

function applyManagedStatusFilter(
  query: Query,
  statusFilter: ManagedListStatusFilter
): Query {
  if (statusFilter === "actionable") {
    return query.where("status", "in", [...ACTIONABLE_REGISTRATION_STATUSES]);
  }
  if (statusFilter === "all") {
    return query;
  }
  return query.where("status", "==", statusFilter);
}

export function isMissingFirestoreIndexError(error: unknown): boolean {
  if (error && typeof error === "object" && "code" in error) {
    return (error as { code: number }).code === 9;
  }
  return false;
}

function sortSummariesBySubmittedAtDesc(
  entries: { summary: RegistrationListSummary; submittedAtMs: number }[]
): RegistrationListSummary[] {
  return [...entries]
    .sort((a, b) => b.submittedAtMs - a.submittedAtMs)
    .map((entry) => entry.summary);
}

function resolvePageStartIndex(
  summaries: RegistrationListSummary[],
  cursor: string | null | undefined
): number {
  if (!cursor) {
    return 0;
  }
  if (cursor.startsWith(SEARCH_CURSOR_PREFIX)) {
    return parseSearchCursorOffset(cursor);
  }
  const cursorIndex = summaries.findIndex((summary) => summary.id === cursor);
  return cursorIndex >= 0 ? cursorIndex + 1 : 0;
}

function paginateSummaries(
  summaries: RegistrationListSummary[],
  params: { pageSize: number; cursor?: string | null | undefined }
): ManagedRegistrationsPage {
  const pageSize = Math.min(Math.max(params.pageSize, 1), MANAGED_PAGE_SIZE_MAX);
  const startIndex = resolvePageStartIndex(summaries, params.cursor);
  const page = summaries.slice(startIndex, startIndex + pageSize);
  const nextOffset = startIndex + pageSize;
  const hasNextPage = nextOffset < summaries.length;

  return {
    registrations: page,
    hasNextPage,
    nextCursor: hasNextPage
      ? page.length > 0
        ? page[page.length - 1]!.id
        : encodeSearchCursorOffset(nextOffset)
      : null,
    searchMode: false,
  };
}

async function fetchManagedSummariesIndexed(
  db: Firestore,
  statusFilter: ManagedListStatusFilter,
  limit: number
): Promise<RegistrationListSummary[]> {
  let query = applyManagedStatusFilter(db.collection(COLLECTION), statusFilter);
  query = query.orderBy("submittedAt", "desc").limit(limit);
  const snap = await query.get();
  return snap.docs.map((doc) => mapRegistrationDocToSummary(doc).summary);
}

async function fetchManagedSummariesInMemory(
  db: Firestore,
  statusFilter: ManagedListStatusFilter,
  limit: number
): Promise<RegistrationListSummary[]> {
  const snap = await db.collection(COLLECTION).limit(limit).get();
  const entries = snap.docs.map((doc) => mapRegistrationDocToSummary(doc));
  const sorted = sortSummariesBySubmittedAtDesc(entries);
  return sorted.filter((summary) => matchesManagedStatusFilter(summary, statusFilter));
}

async function fetchManagedSummaries(
  db: Firestore,
  statusFilter: ManagedListStatusFilter,
  limit: number
): Promise<RegistrationListSummary[]> {
  try {
    return await fetchManagedSummariesIndexed(db, statusFilter, limit);
  } catch (error) {
    if (!isMissingFirestoreIndexError(error)) {
      throw error;
    }
    return fetchManagedSummariesInMemory(db, statusFilter, limit);
  }
}

export type ManagedRegistrationsPage = {
  registrations: RegistrationListSummary[];
  hasNextPage: boolean;
  nextCursor: string | null;
  searchMode: boolean;
  totalMatched?: number;
};

export async function listManagedRegistrations(
  db: Firestore,
  params: ListManagedRegistrationsParams
): Promise<ManagedRegistrationsPage> {
  const searchQuery = params.searchQuery?.trim() ?? "";
  if (needsClientSideFiltering({ ...params, searchQuery })) {
    return listManagedRegistrationsFiltered(db, {
      ...params,
      searchQuery,
    });
  }
  return listManagedRegistrationsPaginated(db, params);
}

async function listManagedRegistrationsPaginated(
  db: Firestore,
  params: ListManagedRegistrationsParams
): Promise<ManagedRegistrationsPage> {
  const pageSize = Math.min(Math.max(params.pageSize, 1), MANAGED_PAGE_SIZE_MAX);
  try {
    let query = applyManagedStatusFilter(db.collection(COLLECTION), params.statusFilter);
    query = query.orderBy("submittedAt", "desc").limit(pageSize + 1);

    if (params.cursor && !params.cursor.startsWith(SEARCH_CURSOR_PREFIX)) {
      const cursorDoc = await db.collection(COLLECTION).doc(params.cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snap = await query.get();
    const hasNextPage = snap.docs.length > pageSize;
    const pageDocs = hasNextPage ? snap.docs.slice(0, pageSize) : snap.docs;
    const registrations = pageDocs.map((doc) => mapRegistrationDocToSummary(doc).summary);
    const nextCursor =
      hasNextPage && pageDocs.length > 0 ? pageDocs[pageDocs.length - 1]!.id : null;

    return {
      registrations,
      hasNextPage,
      nextCursor,
      searchMode: false,
    };
  } catch (error) {
    if (!isMissingFirestoreIndexError(error)) {
      throw error;
    }
    const summaries = await fetchManagedSummariesInMemory(
      db,
      params.statusFilter,
      MANAGED_IN_MEMORY_SCAN_LIMIT
    );
    return paginateSummaries(summaries, params);
  }
}

async function listManagedRegistrationsFiltered(
  db: Firestore,
  params: ListManagedRegistrationsParams & { searchQuery: string }
): Promise<ManagedRegistrationsPage> {
  const pageSize = Math.min(Math.max(params.pageSize, 1), MANAGED_PAGE_SIZE_MAX);
  const summaries = await fetchManagedSummaries(
    db,
    params.statusFilter,
    SEARCH_SCAN_LIMIT
  );
  const matched = filterManagedSummaries(summaries, params);

  const startIndex = resolvePageStartIndex(matched, params.cursor);
  const page = matched.slice(startIndex, startIndex + pageSize);
  const nextOffset = startIndex + pageSize;
  const hasNextPage = nextOffset < matched.length;

  return {
    registrations: page,
    hasNextPage,
    nextCursor: hasNextPage ? encodeSearchCursorOffset(nextOffset) : null,
    searchMode: true,
    totalMatched: matched.length,
  };
}

export function encodeSearchCursorOffset(offset: number): string {
  return `${SEARCH_CURSOR_PREFIX}${offset}`;
}

export function parseSearchCursorOffset(cursor: string | null | undefined): number {
  if (!cursor?.startsWith(SEARCH_CURSOR_PREFIX)) {
    return 0;
  }
  const parsed = Number.parseInt(cursor.slice(SEARCH_CURSOR_PREFIX.length), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export async function getManagedQueueSummary(db: Firestore): Promise<ManagedQueueSummary> {
  const summaries = await fetchManagedSummariesInMemory(
    db,
    "all",
    MANAGED_IN_MEMORY_SCAN_LIMIT
  );
  return summarizeManagedQueue(summaries, MANAGED_IN_MEMORY_SCAN_LIMIT);
}

export type PersonalRegistrationsResult = {
  registrations: RegistrationListSummary[];
};

/** Liste des dossiers soumis par l'utilisateur connecté (tri récent en mémoire). */
export async function listPersonalRegistrations(
  db: Firestore,
  submitterUid: string
): Promise<PersonalRegistrationsResult> {
  const snap = await db
    .collection(COLLECTION)
    .where("submitterUid", "==", submitterUid)
    .limit(50)
    .get();

  const registrations = snap.docs
    .map((doc) => mapRegistrationDocToSummary(doc))
    .sort((a, b) => b.submittedAtMs - a.submittedAtMs)
    .slice(0, 20)
    .map((entry) => entry.summary);

  return { registrations };
}
