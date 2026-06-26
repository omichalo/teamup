import type { Timestamp } from "firebase-admin/firestore";
import { getSuggestionDescriptionExcerpt } from "@/lib/app-suggestions/rich-text";
import type {
  AppSuggestionComment,
  AppSuggestionCommentRecord,
  AppSuggestionRecord,
  AppSuggestionSummary,
  SuggestionDescriptionFormat,
  SuggestionStatusHistoryEntry,
  SuggestionStatusHistoryRecord,
} from "@/lib/app-suggestions/types";

function timestampToIso(value: Timestamp | null | undefined): string | null {
  if (!value || typeof value.toDate !== "function") {
    return null;
  }
  return value.toDate().toISOString();
}

function resolveDescriptionFormat(
  value: SuggestionDescriptionFormat | undefined
): SuggestionDescriptionFormat {
  return value === "html" ? "html" : "plain";
}

export function serializeStatusHistory(
  entries: SuggestionStatusHistoryRecord[] | undefined
): SuggestionStatusHistoryEntry[] {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry) => ({
      status: entry.status,
      updatedAt: timestampToIso(entry.updatedAt) ?? new Date(0).toISOString(),
      updatedByUid: entry.updatedByUid,
      updatedByDisplayName: entry.updatedByDisplayName ?? null,
    }))
    .sort(
      (left, right) =>
        new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime()
    );
}

export function serializeSuggestionSummary(
  id: string,
  data: AppSuggestionRecord,
  commentCount: number
): AppSuggestionSummary {
  const descriptionFormat = resolveDescriptionFormat(data.descriptionFormat);
  return {
    id,
    title: data.title,
    description: data.description,
    descriptionFormat,
    descriptionExcerpt: getSuggestionDescriptionExcerpt(
      data.description,
      descriptionFormat
    ),
    category: data.category,
    priority: data.priority,
    status: data.status,
    submitterUid: data.submitterUid,
    submitterDisplayName: data.submitterDisplayName,
    maintainerNote: data.maintainerNote,
    githubIssueUrl: data.githubIssueUrl,
    commentCount,
    createdAt: timestampToIso(data.createdAt) ?? new Date(0).toISOString(),
    updatedAt: timestampToIso(data.updatedAt) ?? new Date(0).toISOString(),
    statusUpdatedAt: timestampToIso(data.statusUpdatedAt),
  };
}

export function serializeSuggestionComment(
  id: string,
  data: AppSuggestionCommentRecord
): AppSuggestionComment {
  return {
    id,
    authorUid: data.authorUid,
    authorDisplayName: data.authorDisplayName,
    body: data.body,
    bodyFormat: data.bodyFormat === "html" ? "html" : "plain",
    createdAt: timestampToIso(data.createdAt) ?? new Date(0).toISOString(),
  };
}
