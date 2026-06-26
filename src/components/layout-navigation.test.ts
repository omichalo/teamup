import {
  buildLayoutAccountMenuItems,
  buildLayoutNavigation,
} from "@/components/layout-navigation";
import { resolveLayoutHomeHref } from "@/components/layout-nav-utils";

describe("buildLayoutNavigation", () => {
  const base = {
    hasUser: true,
    isAdmin: false,
    isPlayer: false,
    isSecretary: false,
  };

  it("returns player primary links with updated labels", () => {
    const nav = buildLayoutNavigation({ ...base, isPlayer: true });
    expect(nav.primary.map((item) => item.href)).toEqual([
      "/joueur",
      "/club/inscription",
      "/club/mes-inscriptions",
    ]);
    expect(nav.primary.map((item) => item.label)).toEqual([
      "Accueil",
      "Nouvelle adhésion",
      "Mes dossiers",
    ]);
    expect(nav.groups).toHaveLength(0);
  });

  it("keeps secretary work in primary and adhesions in group", () => {
    const nav = buildLayoutNavigation({ ...base, isSecretary: true });
    expect(nav.primary.map((item) => item.href)).toEqual([
      "/club/demandes-adhesion",
      "/club/idees",
    ]);
    expect(nav.groups).toHaveLength(1);
    expect(nav.groups[0]?.id).toBe("adhesions");
    expect(nav.groups[0]?.label).toBe("Adhésions");
    expect(nav.groups[0]?.items.map((item) => item.href)).toEqual([
      "/club/parametrage-inscription",
      "/club/inscription",
    ]);
  });

  it("prioritizes compositions and disponibilites for coach", () => {
    const nav = buildLayoutNavigation(base);
    expect(nav.primary.map((item) => item.href)).toEqual([
      "/compositions",
      "/disponibilites",
      "/club/idees",
    ]);
    expect(nav.groups.map((group) => group.id)).toEqual(["championnat"]);
    expect(nav.groups[0]?.items.map((item) => item.href)).toEqual([
      "/joueurs",
      "/equipes",
      "/compositions/defaults",
    ]);
  });

  it("splits admin navigation across primary and two groups", () => {
    const nav = buildLayoutNavigation({ ...base, isAdmin: true });
    expect(nav.primary.map((item) => item.href)).toEqual([
      "/club/demandes-adhesion",
      "/compositions",
      "/club/idees",
      "/admin",
    ]);
    expect(nav.groups.map((group) => group.id)).toEqual([
      "championnat",
      "adhesions",
    ]);
    expect(nav.groups[0]?.items.map((item) => item.href)).toEqual([
      "/joueurs",
      "/equipes",
      "/disponibilites",
      "/compositions/defaults",
    ]);
  });
});

describe("buildLayoutAccountMenuItems", () => {
  const base = {
    hasUser: true,
    isAdmin: false,
    isPlayer: false,
    isSecretary: false,
  };

  it("returns no account menu for players", () => {
    expect(
      buildLayoutAccountMenuItems({ ...base, isPlayer: true }).map(
        (item) => item.href
      )
    ).toEqual([]);
  });

  it("moves personal links to account menu for coach", () => {
    expect(buildLayoutAccountMenuItems(base).map((item) => item.href)).toEqual([
      "/club/mes-inscriptions",
      "/club/inscription",
    ]);
  });

  it("omits new adhesion for admin account menu", () => {
    expect(
      buildLayoutAccountMenuItems({ ...base, isAdmin: true }).map(
        (item) => item.href
      )
    ).toEqual(["/club/mes-inscriptions"]);
  });
});

describe("resolveLayoutHomeHref", () => {
  it("routes each role to its home", () => {
    expect(resolveLayoutHomeHref({ isPlayer: true, isSecretary: false })).toBe(
      "/joueur"
    );
    expect(resolveLayoutHomeHref({ isPlayer: false, isSecretary: true })).toBe(
      "/club/demandes-adhesion"
    );
    expect(resolveLayoutHomeHref({ isPlayer: false, isSecretary: false })).toBe(
      "/"
    );
  });
});
