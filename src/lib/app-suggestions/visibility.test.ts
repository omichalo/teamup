import { USER_ROLES } from "@/lib/auth/roles";
import {
  canViewSuggestion,
  defaultVisibilityForKind,
  isSuggestionHandler,
  resolveSuggestionVisibility,
  SUGGESTION_VISIBILITY_LABELS,
} from "@/lib/app-suggestions/visibility";

describe("app-suggestions visibility", () => {
  const player = {
    uid: "player-1",
    role: USER_ROLES.PLAYER,
    isMaintainer: false,
    isClubReferent: false,
  };

  const maintainer = {
    uid: "maint-1",
    role: USER_ROLES.ADMIN,
    isMaintainer: true,
    isClubReferent: false,
  };

  const clubReferent = {
    uid: "sec-1",
    role: USER_ROLES.SECRETARY,
    isMaintainer: false,
    isClubReferent: true,
  };

  it("defaults kind to public/private visibility", () => {
    expect(defaultVisibilityForKind("improvement")).toBe("public");
    expect(defaultVisibilityForKind("problem")).toBe("private");
  });

  it("exposes French visibility labels", () => {
    expect(SUGGESTION_VISIBILITY_LABELS.public).toBe("Publique");
    expect(SUGGESTION_VISIBILITY_LABELS.private).toBe("Privée");
  });

  it("treats missing visibility as legacy_staff", () => {
    expect(resolveSuggestionVisibility(undefined)).toBe("legacy_staff");
  });

  it("hides legacy_staff from players", () => {
    expect(
      canViewSuggestion(player, {
        submitterUid: "other",
        domain: "app",
        visibility: "legacy_staff",
      })
    ).toBe(false);
  });

  it("shows public ideas to players", () => {
    expect(
      canViewSuggestion(player, {
        submitterUid: "other",
        domain: "app",
        visibility: "public",
      })
    ).toBe(true);
  });

  it("keeps private problems to author and handlers", () => {
    expect(
      canViewSuggestion(player, {
        submitterUid: "other",
        domain: "app",
        visibility: "private",
      })
    ).toBe(false);
    expect(
      canViewSuggestion(
        { ...player, uid: "author" },
        {
          submitterUid: "author",
          domain: "app",
          visibility: "private",
        }
      )
    ).toBe(true);
    expect(
      canViewSuggestion(maintainer, {
        submitterUid: "author",
        domain: "app",
        visibility: "private",
      })
    ).toBe(true);
  });

  it("lets club referents handle club domain only", () => {
    expect(isSuggestionHandler(clubReferent, "club")).toBe(true);
    expect(isSuggestionHandler(clubReferent, "app")).toBe(false);
    expect(
      canViewSuggestion(clubReferent, {
        submitterUid: "author",
        domain: "club",
        visibility: "private",
      })
    ).toBe(true);
    expect(
      canViewSuggestion(clubReferent, {
        submitterUid: "author",
        domain: "app",
        visibility: "private",
      })
    ).toBe(false);
  });
});
