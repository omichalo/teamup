import type { Firestore } from "firebase-admin/firestore";
import { fetchUserDisplayNames } from "@/lib/auth/resolve-display-name";
import type {
  AppSuggestionDetail,
  AppSuggestionSummary,
} from "@/lib/app-suggestions/types";

function collectMissingDisplayNameUids(
  summaries: readonly AppSuggestionSummary[],
  comments: AppSuggestionDetail["comments"] = []
): string[] {
  const uids = new Set<string>();

  for (const summary of summaries) {
    if (!summary.submitterDisplayName?.trim()) {
      uids.add(summary.submitterUid);
    }
  }

  for (const comment of comments) {
    if (!comment.authorDisplayName?.trim()) {
      uids.add(comment.authorUid);
    }
  }

  return [...uids];
}

export async function enrichSuggestionSummaries(
  db: Firestore,
  summaries: AppSuggestionSummary[]
): Promise<AppSuggestionSummary[]> {
  const missingUids = collectMissingDisplayNameUids(summaries);
  if (missingUids.length === 0) {
    return summaries;
  }

  const namesByUid = await fetchUserDisplayNames(db, missingUids);

  return summaries.map((summary) => ({
    ...summary,
    submitterDisplayName:
      summary.submitterDisplayName?.trim() ||
      namesByUid.get(summary.submitterUid) ||
      null,
  }));
}

export async function enrichSuggestionDetail(
  db: Firestore,
  detail: AppSuggestionDetail
): Promise<AppSuggestionDetail> {
  const missingUids = collectMissingDisplayNameUids([detail], detail.comments);
  if (missingUids.length === 0) {
    return detail;
  }

  const namesByUid = await fetchUserDisplayNames(db, missingUids);

  return {
    ...detail,
    submitterDisplayName:
      detail.submitterDisplayName?.trim() ||
      namesByUid.get(detail.submitterUid) ||
      null,
    comments: detail.comments.map((comment) => ({
      ...comment,
      authorDisplayName:
        comment.authorDisplayName?.trim() ||
        namesByUid.get(comment.authorUid) ||
        null,
    })),
  };
}
