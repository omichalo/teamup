import type { Timestamp } from "firebase-admin/firestore";
import type { SuggestionRichTextFormat } from "@/lib/app-suggestions/rich-text";

export const SUGGESTION_SCHEMA_VERSION = 1 as const;

export const SUGGESTION_CATEGORIES = [
  "adhesions",
  "presences",
  "emails",
  "compositions",
  "joueurs",
  "autre",
] as const;

export type SuggestionCategory = (typeof SUGGESTION_CATEGORIES)[number];

export const SUGGESTION_PRIORITIES = ["low", "medium", "high"] as const;

export type SuggestionPriority = (typeof SUGGESTION_PRIORITIES)[number];

export const SUGGESTION_STATUSES = [
  "received",
  "reviewing",
  "planned",
  "in_progress",
  "released",
  "declined",
] as const;

export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];

export interface SuggestionStatusHistoryRecord {
  status: SuggestionStatus;
  updatedAt: Timestamp;
  updatedByUid: string;
  updatedByDisplayName: string | null;
}

export interface SuggestionStatusHistoryEntry {
  status: SuggestionStatus;
  updatedAt: string;
  updatedByUid: string;
  updatedByDisplayName: string | null;
}

export type SuggestionDescriptionFormat = SuggestionRichTextFormat;

export interface AppSuggestionRecord {
  schemaVersion: typeof SUGGESTION_SCHEMA_VERSION;
  title: string;
  description: string;
  descriptionFormat?: SuggestionDescriptionFormat;
  category: SuggestionCategory;
  priority: SuggestionPriority;
  status: SuggestionStatus;
  submitterUid: string;
  submitterDisplayName: string | null;
  maintainerNote: string | null;
  githubIssueUrl: string | null;
  commentCount?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  statusUpdatedAt: Timestamp | null;
  statusUpdatedBy: string | null;
  statusUpdatedByDisplayName?: string | null;
  statusHistory?: SuggestionStatusHistoryRecord[];
}

export interface AppSuggestionCommentRecord {
  authorUid: string;
  authorDisplayName: string | null;
  body: string;
  bodyFormat?: SuggestionRichTextFormat;
  createdAt: Timestamp;
}

export interface AppSuggestionSummary {
  id: string;
  title: string;
  description: string;
  descriptionFormat: SuggestionDescriptionFormat;
  descriptionExcerpt: string;
  category: SuggestionCategory;
  priority: SuggestionPriority;
  status: SuggestionStatus;
  submitterUid: string;
  submitterDisplayName: string | null;
  maintainerNote: string | null;
  githubIssueUrl: string | null;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  statusUpdatedAt: string | null;
}

export interface AppSuggestionDetail extends AppSuggestionSummary {
  statusUpdatedByDisplayName: string | null;
  statusHistory: SuggestionStatusHistoryEntry[];
  comments: AppSuggestionComment[];
}

export interface AppSuggestionComment {
  id: string;
  authorUid: string;
  authorDisplayName: string | null;
  body: string;
  bodyFormat: SuggestionRichTextFormat;
  createdAt: string;
}
