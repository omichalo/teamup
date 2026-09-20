import {
  canAccessAppSuggestions,
  canCommentOnSuggestions,
  canEditSuggestionContent,
  canManageSuggestionTriage,
} from "@/lib/app-suggestions/access";
import { USER_ROLES } from "@/lib/auth/roles";

describe("app-suggestions access", () => {
  it("allows all connected roles including players", () => {
    expect(canAccessAppSuggestions(USER_ROLES.PLAYER)).toBe(true);
    expect(canAccessAppSuggestions(USER_ROLES.COACH)).toBe(true);
    expect(canAccessAppSuggestions(USER_ROLES.SECRETARY)).toBe(true);
    expect(canAccessAppSuggestions(USER_ROLES.ADMIN)).toBe(true);
    expect(canAccessAppSuggestions(USER_ROLES.BOARD_MEMBER)).toBe(true);
    expect(canAccessAppSuggestions(USER_ROLES.ASSISTANT_SECRETARY)).toBe(true);
  });

  it("allows comments for accessible roles", () => {
    expect(canCommentOnSuggestions(USER_ROLES.COACH)).toBe(true);
    expect(canCommentOnSuggestions(USER_ROLES.PLAYER)).toBe(true);
  });

  it("allows author edits only while status is open", () => {
    expect(
      canEditSuggestionContent(
        USER_ROLES.PLAYER,
        "uid-a",
        "uid-a",
        "received",
        false
      )
    ).toBe(true);
    expect(
      canEditSuggestionContent(
        USER_ROLES.PLAYER,
        "uid-a",
        "uid-a",
        "planned",
        false
      )
    ).toBe(false);
    expect(
      canEditSuggestionContent(
        USER_ROLES.COACH,
        "uid-a",
        "uid-b",
        "received",
        false
      )
    ).toBe(false);
  });

  it("allows maintainers to manage triage flag", () => {
    expect(canManageSuggestionTriage(true)).toBe(true);
    expect(canManageSuggestionTriage(false)).toBe(false);
  });
});
