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
} from "@/lib/app-suggestions/types";
import { SUGGESTION_SCHEMA_VERSION } from "@/lib/app-suggestions/types";
import { resolveStoredCommentCount } from "@/lib/app-suggestions/resolve-comment-count";
import {
  collectOrphanedSuggestionImageUrls,
  deleteSuggestionImagesForUid,
} from "@/lib/app-suggestions/suggestion-image-storage";
import { enrichSuggestionDetail } from "@/lib/app-suggestions/enrich-display-names";
import { buildSuggestionPriorityFields } from "@/lib/app-suggestions/priority-fields";
import {
  canSeeInternalFields,
  canViewSuggestion,
  defaultVisibilityForKind,
  resolveSuggestionDomain,
  resolveSuggestionVisibility,
  type SuggestionViewerContext,
} from "@/lib/app-suggestions/visibility";
import {
  defaultWaitingOnForStatus,
  waitingOnAfterAuthorComment,
  waitingOnAfterHandlerComment,
} from "@/lib/app-suggestions/waiting-on";

const COLLECTION = "appSuggestions";
export {
  listDistinctSuggestionCategories,
  listSuggestions,
  SUGGESTIONS_PAGE_SIZE_DEFAULT,
  SUGGESTIONS_PAGE_SIZE_MAX,
} from "@/lib/app-suggestions/list-suggestions";

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
  const domain = resolveSuggestionDomain(input.domain);
  const visibility = defaultVisibilityForKind(input.kind);
  const waitingOn = defaultWaitingOnForStatus("received");

  await docRef.set({
    schemaVersion: SUGGESTION_SCHEMA_VERSION,
    title: input.title,
    description: input.description,
    descriptionFormat: "html",
    kind: input.kind,
    domain,
    visibility,
    waitingOn,
    category: input.category,
    ...buildSuggestionPriorityFields("medium"),
    status: "received",
    submitterUid: submitter.uid,
    submitterDisplayName: submitter.displayName,
    maintainerNote: null,
    githubIssueUrl: null,
    commentCount: 0,
    supportCount: 0,
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
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

export async function getSuggestionDetail(
  db: Firestore,
  suggestionId: string,
  viewer?: SuggestionViewerContext
): Promise<AppSuggestionDetail | null> {
  const docSnap = await suggestionsCollection(db).doc(suggestionId).get();
  if (!docSnap.exists) {
    return null;
  }

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

  const includeInternal = viewer ? canSeeInternalFields(viewer) : false;
  const commentsSnapshot = await docSnap.ref
    .collection("comments")
    .orderBy("createdAt", "asc")
    .get();

  const comments = commentsSnapshot.docs
    .map((commentDoc) =>
      serializeSuggestionComment(
        commentDoc.id,
        commentDoc.data() as AppSuggestionCommentRecord
      )
    )
    .filter((comment) => {
      if (!comment.hidden) {
        return true;
      }
      return Boolean(
        viewer &&
          (viewer.isMaintainer ||
            viewer.isClubReferent ||
            comment.authorUid === viewer.uid)
      );
    });

  const commentCount = commentsSnapshot.docs.filter((doc) => {
    const hiddenAt = doc.get("hiddenAt");
    return !hiddenAt;
  }).length;
  const storedCount = resolveStoredCommentCount(data, commentCount);
  if (storedCount !== commentCount) {
    await docSnap.ref.update({ commentCount }).catch(() => undefined);
  }

  return enrichSuggestionDetail(db, {
    ...serializeSuggestionSummary(docSnap.id, data, commentCount, {
      includeInternalFields: includeInternal,
    }),
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
    if (patch.waitingOn === undefined) {
      updates.waitingOn = defaultWaitingOnForStatus(patch.status);
    }
  }
  if (patch.priority !== undefined) {
    Object.assign(updates, buildSuggestionPriorityFields(patch.priority));
  }
  if (patch.waitingOn !== undefined) {
    updates.waitingOn = patch.waitingOn;
  }
  if (patch.maintainerNote !== undefined) {
    updates.maintainerNote = patch.maintainerNote;
  }
  if (patch.githubIssueUrl !== undefined) {
    updates.githubIssueUrl = patch.githubIssueUrl;
  }
  updates.lastActivityAt = FieldValue.serverTimestamp();

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

  const current = docSnap.data() as AppSuggestionRecord;
  const commentRef = docRef.collection("comments").doc();
  await commentRef.set({
    authorUid: author.uid,
    authorDisplayName: author.displayName,
    body: input.body,
    bodyFormat: "html",
    createdAt: FieldValue.serverTimestamp(),
  });

  const isAuthorReply = author.uid === current.submitterUid;
  const waitingOn = isAuthorReply
    ? waitingOnAfterAuthorComment(current.waitingOn)
    : waitingOnAfterHandlerComment();

  await docRef.update({
    updatedAt: FieldValue.serverTimestamp(),
    lastActivityAt: FieldValue.serverTimestamp(),
    commentCount: FieldValue.increment(1),
    waitingOn,
  });

  return commentRef.id;
}
