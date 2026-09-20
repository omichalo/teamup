import type { Timestamp } from "firebase-admin/firestore";
import { getSuggestionDescriptionExcerpt } from "@/lib/app-suggestions/rich-text";
import { resolveStoredSuggestionPriority } from "@/lib/app-suggestions/priority-fields";
import {
  resolveSuggestionDomain,
  resolveSuggestionVisibility,
} from "@/lib/app-suggestions/visibility";
import { defaultWaitingOnForStatus } from "@/lib/app-suggestions/waiting-on";
import type {
  AppSuggestionComment,
  AppSuggestionCommentRecord,
  AppSuggestionRecord,
  AppSuggestionSummary,
  SuggestionDescriptionFormat,
  SuggestionKind,
  SuggestionStatusHistoryEntry,
  SuggestionStatusHistoryRecord,
  SuggestionWaitingOn,
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

function resolveSuggestionKind(value: SuggestionKind | undefined): SuggestionKind {
  return value === "problem" ? "problem" : "improvement";
}

function resolveWaitingOn(
  data: AppSuggestionRecord
): SuggestionWaitingOn {
  if (
    data.waitingOn === "none" ||
    data.waitingOn === "author" ||
    data.waitingOn === "handlers"
  ) {
    return data.waitingOn;
  }
  return defaultWaitingOnForStatus(data.status);
}

export function serializeSuggestionSummary(
  id: string,
  data: AppSuggestionRecord,
  commentCount: number,
  options?: { includeInternalFields?: boolean }
): AppSuggestionSummary {
  const descriptionFormat = resolveDescriptionFormat(data.descriptionFormat);
  const includeInternal = options?.includeInternalFields === true;
  return {
    id,
    title: data.title,
    description: data.description,
    descriptionFormat,
    descriptionExcerpt: getSuggestionDescriptionExcerpt(
      data.description,
      descriptionFormat
    ),
    kind: resolveSuggestionKind(data.kind),
    domain: resolveSuggestionDomain(data.domain),
    visibility: resolveSuggestionVisibility(data.visibility),
    waitingOn: resolveWaitingOn(data),
    category: data.category,
    priority: resolveStoredSuggestionPriority(data.priority),
    status: data.status,
    submitterUid: data.submitterUid,
    submitterDisplayName: data.submitterDisplayName,
    maintainerNote: data.maintainerNote,
    githubIssueUrl: includeInternal ? data.githubIssueUrl : null,
    commentCount,
    supportCount: typeof data.supportCount === "number" ? data.supportCount : 0,
    createdAt: timestampToIso(data.createdAt) ?? new Date(0).toISOString(),
    updatedAt: timestampToIso(data.updatedAt) ?? new Date(0).toISOString(),
    lastActivityAt:
      timestampToIso(data.lastActivityAt) ??
      timestampToIso(data.updatedAt) ??
      timestampToIso(data.createdAt),
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
    hidden: Boolean(data.hiddenAt),
  };
}
