import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import type {
  SuggestionAuthorPatchInput,
  SuggestionCommentCreateInput,
  SuggestionCreateInput,
  SuggestionMaintainerPatchInput,
} from "@/lib/app-suggestions/schema";
import {
  serializeSuggestionComment,
  serializeSuggestionSummary,
  serializeStatusHistory,
} from "@/lib/app-suggestions/serialize";
import type {
  AppSuggestionCommentRecord,
  AppSuggestionDetail,
  AppSuggestionRecord,
  AppSuggestionSummary,
  SuggestionCategory,
  SuggestionKind,
} from "@/lib/app-suggestions/types";
import { SUGGESTION_SCHEMA_VERSION } from "@/lib/app-suggestions/types";
import {
  SUGGESTION_OPEN_STATUSES,
  compareSuggestionsByPriority,
  type SuggestionStatusFilter,
} from "@/lib/app-suggestions/status";
import { resolveStoredCommentCount } from "@/lib/app-suggestions/resolve-comment-count";
import {
  collectOrphanedSuggestionImageUrls,
  deleteSuggestionImagesForUid,
} from "@/lib/app-suggestions/suggestion-image-storage";
import {
  enrichSuggestionDetail,
  enrichSuggestionSummaries,
} from "@/lib/app-suggestions/enrich-display-names";
import {
  formatSuggestionCategoryLabel,
  isValidSuggestionCategory,
  normalizeSuggestionCategory,
} from "@/lib/app-suggestions/categories";
import { buildSuggestionPriorityFields } from "@/lib/app-suggestions/priority-fields";

const COLLECTION = "appSuggestions";

export const SUGGESTIONS_PAGE_SIZE_DEFAULT = 50;
export const SUGGESTIONS_PAGE_SIZE_MAX = 100;

function suggestionsCollection(db: Firestore) {
  return db.collection(COLLECTION);
}

export async function createSuggestion(
  db: Firestore,
  input: SuggestionCreateInput,
  submitter: { uid: string; displayName: string | null }
): Promise<string> {
  const docRef = suggestionsCollection(db).doc();
  const now = FieldValue.serverTimestamp();
  const historyTimestamp = Timestamp.now();

  await docRef.set({
    schemaVersion: SUGGESTION_SCHEMA_VERSION,
    title: input.title,
    description: input.description,
    descriptionFormat: "html",
    kind: input.kind,
    category: input.category,
    ...buildSuggestionPriorityFields(input.priority),
    status: "received",
    submitterUid: submitter.uid,
    submitterDisplayName: submitter.displayName,
    maintainerNote: null,
    githubIssueUrl: null,
    commentCount: 0,
    createdAt: now,
    updatedAt: now,
    statusUpdatedAt: now,
    statusUpdatedBy: submitter.uid,
    statusUpdatedByDisplayName: submitter.displayName,
    statusHistory: [
      {
        status: "received",
        updatedAt: historyTimestamp,
        updatedByUid: submitter.uid,
        updatedByDisplayName: submitter.displayName,
      },
    ],
  });

  return docRef.id;
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
  sortedInMemory: boolean
): Promise<{
  suggestions: AppSuggestionSummary[];
  hasNextPage: boolean;
  nextCursor: string | null;
}> {
  const hasNextPage = docs.length > pageSize;
  const pageDocs = hasNextPage ? docs.slice(0, pageSize) : docs;
  let suggestions = await mapSuggestionDocs(db, pageDocs);

  if (sortedInMemory) {
    suggestions = [...suggestions].sort(compareSuggestionsByPriority);
  }

  const lastDoc = pageDocs.at(-1);
  const nextCursor = hasNextPage && lastDoc ? lastDoc.id : null;

  return { suggestions, hasNextPage, nextCursor };
}

async function mapSuggestionDocs(
  db: Firestore,
  docs: FirebaseFirestore.QueryDocumentSnapshot[]
): Promise<AppSuggestionSummary[]> {
  const suggestions = docs.map((docSnap) => {
    const data = docSnap.data() as AppSuggestionRecord;
    return serializeSuggestionSummary(
      docSnap.id,
      data,
      resolveStoredCommentCount(data)
    );
  });

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

  if (options.kindFilter === "improvement") {
    const matched: AppSuggestionSummary[] = [];
    let cursor = options.cursor ?? null;

    while (matched.length < pageSize + 1) {
      const page = await fetchSuggestionsPageDocs(
        db,
        { ...options, kindFilter: "all" },
        { pageSize: pageSize + 1, cursor }
      );

      if (page.docs.length === 0) {
        break;
      }

      const suggestions = await mapSuggestionDocs(db, page.docs);
      matched.push(
        ...suggestions.filter((suggestion) => suggestion.kind === "improvement")
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

  return finalizeSuggestionPage(db, page.docs, pageSize, page.sortedInMemory);
}

export async function getSuggestionDetail(
  db: Firestore,
  suggestionId: string
): Promise<AppSuggestionDetail | null> {
  const docSnap = await suggestionsCollection(db).doc(suggestionId).get();
  if (!docSnap.exists) {
    return null;
  }

  const data = docSnap.data() as AppSuggestionRecord;
  const commentsSnapshot = await docSnap.ref
    .collection("comments")
    .orderBy("createdAt", "asc")
    .get();

  const comments = commentsSnapshot.docs.map((commentDoc) =>
    serializeSuggestionComment(
      commentDoc.id,
      commentDoc.data() as AppSuggestionCommentRecord
    )
  );

  const commentCount = comments.length;
  const storedCount = resolveStoredCommentCount(data, commentCount);
  if (storedCount !== commentCount) {
    await docSnap.ref.update({ commentCount }).catch(() => undefined);
  }

  return enrichSuggestionDetail(db, {
    ...serializeSuggestionSummary(docSnap.id, data, commentCount),
    statusUpdatedByDisplayName: data.statusUpdatedByDisplayName ?? null,
    statusHistory: serializeStatusHistory(data.statusHistory),
    comments,
  });
}

export async function patchSuggestionAsAuthor(
  db: Firestore,
  suggestionId: string,
  patch: SuggestionAuthorPatchInput,
  editorUid: string
): Promise<boolean> {
  const docRef = suggestionsCollection(db).doc(suggestionId);
  const docSnap = await docRef.get();
  if (!docSnap.exists) {
    return false;
  }

  const current = docSnap.data() as AppSuggestionRecord;
  const updates: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (patch.title !== undefined) updates.title = patch.title;
  if (patch.description !== undefined) {
    updates.description = patch.description;
    updates.descriptionFormat = "html";
  }
  if (patch.category !== undefined) updates.category = patch.category;
  if (patch.priority !== undefined) {
    Object.assign(updates, buildSuggestionPriorityFields(patch.priority));
  }

  await docRef.update(updates);

  if (
    patch.description !== undefined &&
    patch.description !== current.description
  ) {
    const orphanedUrls = collectOrphanedSuggestionImageUrls(
      current.description,
      patch.description
    );
    if (orphanedUrls.length > 0) {
      await deleteSuggestionImagesForUid(editorUid, orphanedUrls);
    }
  }

  return true;
}

export async function patchSuggestionAsMaintainer(
  db: Firestore,
  suggestionId: string,
  patch: SuggestionMaintainerPatchInput,
  maintainer: { uid: string; displayName: string | null }
): Promise<boolean> {
  const docRef = suggestionsCollection(db).doc(suggestionId);
  const docSnap = await docRef.get();
  if (!docSnap.exists) {
    return false;
  }

  const current = docSnap.data() as AppSuggestionRecord;
  const updates: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (patch.status !== undefined && patch.status !== current.status) {
    const statusChangedAt = Timestamp.now();
    const historyEntry = {
      status: patch.status,
      updatedAt: statusChangedAt,
      updatedByUid: maintainer.uid,
      updatedByDisplayName: maintainer.displayName,
    };
    updates.status = patch.status;
    updates.statusUpdatedAt = FieldValue.serverTimestamp();
    updates.statusUpdatedBy = maintainer.uid;
    updates.statusUpdatedByDisplayName = maintainer.displayName;
    updates.statusHistory = [...(current.statusHistory ?? []), historyEntry];
  }
  if (patch.priority !== undefined) {
    Object.assign(updates, buildSuggestionPriorityFields(patch.priority));
  }
  if (patch.maintainerNote !== undefined) {
    updates.maintainerNote = patch.maintainerNote;
  }
  if (patch.githubIssueUrl !== undefined) {
    updates.githubIssueUrl = patch.githubIssueUrl;
  }

  await docRef.update(updates);
  return true;
}

export async function addSuggestionComment(
  db: Firestore,
  suggestionId: string,
  input: SuggestionCommentCreateInput,
  author: { uid: string; displayName: string | null }
): Promise<string | null> {
  const docRef = suggestionsCollection(db).doc(suggestionId);
  const docSnap = await docRef.get();
  if (!docSnap.exists) {
    return null;
  }

  const commentRef = docRef.collection("comments").doc();
  await commentRef.set({
    authorUid: author.uid,
    authorDisplayName: author.displayName,
    body: input.body,
    bodyFormat: "html",
    createdAt: FieldValue.serverTimestamp(),
  });

  await docRef.update({
    updatedAt: FieldValue.serverTimestamp(),
    commentCount: FieldValue.increment(1),
  });

  return commentRef.id;
}
