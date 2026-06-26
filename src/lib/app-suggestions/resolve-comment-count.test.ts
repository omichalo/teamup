import { resolveStoredCommentCount } from "@/lib/app-suggestions/resolve-comment-count";
import type { AppSuggestionRecord } from "@/lib/app-suggestions/types";

describe("resolveStoredCommentCount", () => {
  const base = {
    commentCount: undefined,
  } as AppSuggestionRecord;

  it("utilise le compteur stocké", () => {
    expect(resolveStoredCommentCount({ ...base, commentCount: 3 })).toBe(3);
  });

  it("retombe sur le fallback puis zéro", () => {
    expect(resolveStoredCommentCount(base, 2)).toBe(2);
    expect(resolveStoredCommentCount(base)).toBe(0);
  });
});
