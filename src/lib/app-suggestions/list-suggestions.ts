import type { Firestore } from "firebase-admin/firestore";
import {
  serializeSuggestionSummary,
} from "@/lib/app-suggestions/serialize";
import type {
  AppSuggestionRecord,
  AppSuggestionSummary,
  SuggestionCategory,
  SuggestionKind,
} from "@/lib/app-suggestions/types";
import {
  SUGGESTION_OPEN_STATUSES,
  compareSuggestionsByPriority,
  type SuggestionStatusFilter,
} from "@/lib/app-suggestions/status";
import { resolveStoredCommentCount } from "@/lib/app-suggestions/resolve-comment-count";
import { enrichSuggestionSummaries } from "@/lib/app-suggestions/enrich-display-names";
import {
  formatSuggestionCategoryLabel,
  isValidSuggestionCategory,
  normalizeSuggestionCategory,
} from "@/lib/app-suggestions/categories";
import {
  canSeeInternalFields,
  canViewSuggestion,
  resolveSuggestionDomain,
  resolveSuggestionVisibility,
  type SuggestionViewerContext,
} from "@/lib/app-suggestions/visibility";

const COLLECTION = "appSuggestions";
export const SUGGESTIONS_PAGE_SIZE_DEFAULT = 50;
export const SUGGESTIONS_PAGE_SIZE_MAX = 100;

function suggestionsCollection(db: Firestore) {
  return db.collection(COLLECTION);
}

function buildSuggestionsListQuery(
  db: Firestore,
  filters: {
    statusFilter: SuggestionStatusFilter;
    categoryFilter: SuggestionCategory | "all";
    kindFilter: SuggestionKind | "all";
    mineOnly: boolean;
    submitterUid?: string;
  },
  sortMode: "priority" | "createdAt" = "priority"
): FirebaseFirestore.Query {
  let query: FirebaseFirestore.Query = suggestionsCollection(db);

  if (filters.mineOnly && filters.submitterUid) {
    query = query.where("submitterUid", "==", filters.submitterUid);
  }
  if (filters.kindFilter === "problem") {
    query = query.where("kind", "==", "problem");
  }
  if (filters.statusFilter === "open") {
    query = query.where("status", "in", [...SUGGESTION_OPEN_STATUSES]);
  } else if (filters.statusFilter !== "all") {
    query = query.where("status", "==", filters.statusFilter);
  }
  if (filters.categoryFilter !== "all") {
    query = query.where("category", "==", filters.categoryFilter);
  }

  if (sortMode === "priority") {
    return query.orderBy("priorityRank", "desc").orderBy("createdAt", "desc");
  }

  return query.orderBy("createdAt", "desc");
}

function isMissingOrBuildingIndexError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = (error as { code?: number }).code;
  const message = String((error as { message?: string }).message ?? "");

  return (
    code === 9 &&
    (message.includes("requires an index") ||
      message.includes("index is currently building"))
  );
}

async function fetchSuggestionsPageDocs(
  db: Firestore,
  filters: {
    statusFilter: SuggestionStatusFilter;
    categoryFilter: SuggestionCategory | "all";
    kindFilter: SuggestionKind | "all";
    mineOnly: boolean;
    submitterUid?: string;
  },
  options: {
    pageSize: number;
    cursor?: string | null;
  }
): Promise<{
  docs: FirebaseFirestore.QueryDocumentSnapshot[];
  sortedInMemory: boolean;
}> {
  const runQuery = async (sortMode: "priority" | "createdAt") => {
    let query = buildSuggestionsListQuery(db, filters, sortMode);

    if (options.cursor) {
      const cursorDoc = await suggestionsCollection(db).doc(options.cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    return query.limit(options.pageSize).get();
  };

  try {
    const snapshot = await runQuery("priority");
    return { docs: snapshot.docs, sortedInMemory: false };
  } catch (error) {
    if (!isMissingOrBuildingIndexError(error)) {
      throw error;
    }

    const snapshot = await runQuery("createdAt");
    return { docs: snapshot.docs, sortedInMemory: true };
  }
}

async function finalizeSuggestionPage(
  db: Firestore,
  docs: FirebaseFirestore.QueryDocumentSnapshot[],
  pageSize: number,
  sortedInMemory: boolean,
  viewer?: SuggestionViewerContext
): Promise<{
  suggestions: AppSuggestionSummary[];
  hasNextPage: boolean;
  nextCursor: string | null;
}> {
  const hasNextPage = docs.length > pageSize;
  const pageDocs = hasNextPage ? docs.slice(0, pageSize) : docs;
  let suggestions = await mapSuggestionDocs(db, pageDocs, viewer);

  if (sortedInMemory) {
    suggestions = [...suggestions].sort(compareSuggestionsByPriority);
  }

  const lastDoc = pageDocs.at(-1);
  const nextCursor = hasNextPage && lastDoc ? lastDoc.id : null;

  return { suggestions, hasNextPage, nextCursor };
}

async function mapSuggestionDocs(
  db: Firestore,
  docs: FirebaseFirestore.QueryDocumentSnapshot[],
  viewer?: SuggestionViewerContext
): Promise<AppSuggestionSummary[]> {
  const includeInternal = viewer ? canSeeInternalFields(viewer) : false;
  const suggestions = docs
    .map((docSnap) => {
      const data = docSnap.data() as AppSuggestionRecord;
      if (
        viewer &&
        !canViewSuggestion(viewer, {
          submitterUid: data.submitterUid,
          domain: resolveSuggestionDomain(data.domain),
          visibility: resolveSuggestionVisibility(data.visibility),
        })
      ) {
        return null;
      }
      return serializeSuggestionSummary(
        docSnap.id,
        data,
        resolveStoredCommentCount(data),
        { includeInternalFields: includeInternal }
      );
    })
    .filter((value): value is AppSuggestionSummary => value !== null);

  return enrichSuggestionSummaries(db, suggestions);
}

export async function listDistinctSuggestionCategories(
  db: Firestore
): Promise<string[]> {
  const snapshot = await suggestionsCollection(db).select("category").get();
  const categories = new Set<string>();

  for (const docSnap of snapshot.docs) {
    const category = docSnap.get("category");
    if (typeof category === "string" && isValidSuggestionCategory(category)) {
      categories.add(normalizeSuggestionCategory(category));
    }
  }

  return Array.from(categories).sort((left, right) =>
    formatSuggestionCategoryLabel(left).localeCompare(
      formatSuggestionCategoryLabel(right),
      "fr"
    )
  );
}

export async function listSuggestions(
  db: Firestore,
  options: {
    statusFilter: SuggestionStatusFilter;
    categoryFilter: SuggestionCategory | "all";
    kindFilter: SuggestionKind | "all";
    mineOnly: boolean;
    submitterUid?: string;
    pageSize: number;
    cursor?: string | null;
    viewer?: SuggestionViewerContext;
    waitingOnFilter?: "handlers" | "all";
  }
): Promise<{
  suggestions: AppSuggestionSummary[];
  hasNextPage: boolean;
  nextCursor: string | null;
}> {
  const pageSize = Math.min(
    Math.max(options.pageSize, 1),
    SUGGESTIONS_PAGE_SIZE_MAX
  );
  const waitingOnFilter = options.waitingOnFilter ?? "all";
  const needsPostFilter =
    options.kindFilter === "improvement" || waitingOnFilter === "handlers";

  if (needsPostFilter) {
    const matched: AppSuggestionSummary[] = [];
    let cursor = options.cursor ?? null;

    while (matched.length < pageSize + 1) {
      const page = await fetchSuggestionsPageDocs(
        db,
        {
          ...options,
          kindFilter:
            options.kindFilter === "improvement" ? "all" : options.kindFilter,
        },
        { pageSize: pageSize + 1, cursor }
      );

      if (page.docs.length === 0) {
        break;
      }

      const suggestions = await mapSuggestionDocs(
        db,
        page.docs,
        options.viewer
      );
      matched.push(
        ...suggestions.filter((suggestion) => {
          if (
            options.kindFilter === "improvement" &&
            suggestion.kind !== "improvement"
          ) {
            return false;
          }
          if (
            waitingOnFilter === "handlers" &&
            suggestion.waitingOn !== "handlers"
          ) {
            return false;
          }
          return true;
        })
      );

      if (page.docs.length <= pageSize) {
        break;
      }

      cursor = page.docs[page.docs.length - 1]?.id ?? null;
      if (!cursor) {
        break;
      }
    }

    const hasNextPage = matched.length > pageSize;
    const suggestions = matched
      .slice(0, pageSize)
      .sort(compareSuggestionsByPriority);
    const nextCursor =
      hasNextPage && suggestions.length > 0
        ? (suggestions[suggestions.length - 1]?.id ?? null)
        : null;

    return { suggestions, hasNextPage, nextCursor };
  }

  const page = await fetchSuggestionsPageDocs(db, options, {
    pageSize: pageSize + 1,
    ...(options.cursor !== undefined ? { cursor: options.cursor } : {}),
  });

  return finalizeSuggestionPage(
    db,
    page.docs,
    pageSize,
    page.sortedInMemory,
    options.viewer
  );
}

