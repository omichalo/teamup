import { buildCoachAdminHomeContent } from "@/lib/navigation/coach-admin-home-content";

describe("buildCoachAdminHomeContent", () => {
  it("structures coach home by championnat and account", () => {
    const content = buildCoachAdminHomeContent(false);

    expect(content.heroCtas.map((item) => item.href)).toEqual([
      "/compositions",
      "/disponibilites",
      "/club/idees",
    ]);
    expect(content.sections.map((section) => section.id)).toEqual([
      "championnat",
      "ideas",
      "account",
    ]);
    expect(content.sections[0]?.items.map((item) => item.href)).toEqual([
      "/joueurs",
      "/equipes",
      "/compositions/defaults",
    ]);
    expect(content.sections[2]?.items.map((item) => item.label)).toEqual([
      "Mes dossiers",
      "Nouvelle adhésion",
    ]);
  });

  it("adds adhesions and admin hero actions for administrators", () => {
    const content = buildCoachAdminHomeContent(true);

    expect(content.heroCtas.map((item) => item.href)).toEqual([
      "/club/demandes-adhesion",
      "/compositions",
      "/club/idees",
      "/admin",
    ]);
    expect(content.sections.map((section) => section.id)).toEqual([
      "championnat",
      "adhesions",
      "ideas",
      "account",
    ]);
    expect(content.sections[1]?.items.map((item) => item.href)).toEqual([
      "/club/parametrage-inscription",
      "/club/inscription",
    ]);
  });
});
