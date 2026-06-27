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
    priority: "medium",
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
  }
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

  return query.orderBy("createdAt", "desc");
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
      let query = buildSuggestionsListQuery(db, {
        ...options,
        kindFilter: "all",
      });

      if (cursor) {
        const cursorDoc = await suggestionsCollection(db).doc(cursor).get();
        if (cursorDoc.exists) {
          query = query.startAfter(cursorDoc);
        }
      }

      const snapshot = await query.limit(pageSize + 1).get();
      if (snapshot.empty) {
        break;
      }

      const suggestions = await mapSuggestionDocs(db, snapshot.docs);
      matched.push(...suggestions.filter((suggestion) => suggestion.kind === "improvement"));

      if (snapshot.docs.length <= pageSize) {
        break;
      }

      cursor = snapshot.docs[snapshot.docs.length - 1]?.id ?? null;
      if (!cursor) {
        break;
      }
    }

    const hasNextPage = matched.length > pageSize;
    const suggestions = matched.slice(0, pageSize);
    const nextCursor =
      hasNextPage && suggestions.length > 0
        ? (suggestions[suggestions.length - 1]?.id ?? null)
        : null;

    return { suggestions, hasNextPage, nextCursor };
  }

  let query = buildSuggestionsListQuery(db, options);

  if (options.cursor) {
    const cursorDoc = await suggestionsCollection(db).doc(options.cursor).get();
    if (cursorDoc.exists) {
      query = query.startAfter(cursorDoc);
    }
  }

  const snapshot = await query.limit(pageSize + 1).get();
  const docs = snapshot.docs;
  const hasNextPage = docs.length > pageSize;
  const pageDocs = hasNextPage ? docs.slice(0, pageSize) : docs;
  const lastDoc = pageDocs.at(-1);
  const nextCursor = hasNextPage && lastDoc ? lastDoc.id : null;

  return {
    suggestions: await mapSuggestionDocs(db, pageDocs),
    hasNextPage,
    nextCursor,
  };
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
  if (patch.priority !== undefined) updates.priority = patch.priority;
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
