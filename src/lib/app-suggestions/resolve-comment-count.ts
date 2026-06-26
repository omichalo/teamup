import type { AppSuggestionRecord } from "@/lib/app-suggestions/types";

export function resolveStoredCommentCount(
  data: AppSuggestionRecord,
  fallbackCount?: number
): number {
  if (
    typeof data.commentCount === "number" &&
    Number.isInteger(data.commentCount) &&
    data.commentCount >= 0
  ) {
    return data.commentCount;
  }
  if (typeof fallbackCount === "number" && fallbackCount >= 0) {
    return fallbackCount;
  }
  return 0;
}
