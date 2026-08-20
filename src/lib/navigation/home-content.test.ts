import {
  buildLayoutAccountMenuItems,
  buildLayoutNavigation,
} from "@/components/layout-navigation";
import { USER_ROLES, type UserRole } from "@/lib/auth/roles";
import {
  buildRoleHomeContent,
  listHomeCardHrefs,
} from "@/lib/navigation/home-content";

function navOptionsForRole(role: UserRole) {
  return {
    hasUser: true,
    isAdmin: role === USER_ROLES.ADMIN,
    isPlayerLike:
      role === USER_ROLES.PLAYER ||
      role === USER_ROLES.ASSISTANT_SECRETARY ||
      role === USER_ROLES.BOARD_MEMBER,
    isAssistantSecretary: role === USER_ROLES.ASSISTANT_SECRETARY,
    isSecretary: role === USER_ROLES.SECRETARY,
    isBoardMember: role === USER_ROLES.BOARD_MEMBER,
    canAccessSpreadsheet:
      role === USER_ROLES.ADMIN ||
      role === USER_ROLES.SECRETARY ||
      role === USER_ROLES.ASSISTANT_SECRETARY ||
      role === USER_ROLES.BOARD_MEMBER ||
      role === USER_ROLES.COACH,
  };
}

function expectedNavHrefs(role: UserRole): string[] {
  const options = navOptionsForRole(role);
  const nav = buildLayoutNavigation(options);
  const accountItems = buildLayoutAccountMenuItems(options);
  const homePath = options.isPlayerLike ? "/joueur" : "/";
  return [
    ...nav.primary.map((item) => item.href),
    ...nav.groups.flatMap((group) => group.items.map((item) => item.href)),
    ...accountItems.map((item) => item.href),
  ].filter((href) => href !== homePath);
}

describe("buildRoleHomeContent", () => {
  it("keeps a welcome-only hero copy and grouped spaces for every role", () => {
    for (const role of Object.values(USER_ROLES)) {
      const content = buildRoleHomeContent(role);
      expect(content.title).toBe("Bienvenue sur TeamUp");
      expect(content.eyebrow.length).toBeGreaterThan(0);
      expect(content.subtitle.length).toBeGreaterThan(0);
      expect(content.sections.length).toBeGreaterThan(0);
      expect(
        content.sections.every((section) => section.items.length > 0),
      ).toBe(true);
    }
  });

  it("surfaces every navigation destination as a home card", () => {
    for (const role of Object.values(USER_ROLES)) {
      const missing = expectedNavHrefs(role).filter(
        (href) => !listHomeCardHrefs(buildRoleHomeContent(role)).includes(href),
      );
      expect({ role, missing }).toEqual({ role, missing: [] });
    }
  });

  it("gives the coach the championship tools and the membership spreadsheet", () => {
    const hrefs = listHomeCardHrefs(buildRoleHomeContent(USER_ROLES.COACH));
    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/compositions",
        "/disponibilites",
        "/joueurs",
        "/club/adhesions-tableau",
        "/club/inscription",
      ]),
    );
    expect(hrefs).not.toContain("/club/demandes-adhesion");
    expect(hrefs).not.toContain("/admin");
  });

  it("keeps board members on the player journey plus spreadsheet and attendance", () => {
    const content = buildRoleHomeContent(USER_ROLES.BOARD_MEMBER);
    expect(content.sections.map((section) => section.id)).toEqual([
      "adhesions",
    ]);
    expect(listHomeCardHrefs(content)).toEqual([
      "/club/adhesions-tableau",
      "/club/presences",
      "/club/presences/essais",
      "/club/inscription",
      "/club/mes-inscriptions",
    ]);
  });

  it("does not give a regular member the spreadsheet", () => {
    expect(listHomeCardHrefs(buildRoleHomeContent(USER_ROLES.PLAYER))).toEqual([
      "/club/inscription",
      "/club/mes-inscriptions",
    ]);
  });
});
