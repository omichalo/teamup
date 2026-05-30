import { buildDefaultRegistrationConfig } from "./default-config";
import {
  inferLinkedSectionIdsFromSite,
  repairSiteLinkedSectionIds,
} from "./site-section-links";
import { validateRegistrationConfigCrossRefs } from "./validate-config";

describe("inferLinkedSectionIdsFromSite", () => {
  it("lie Vaucresson → section handisport uniquement", () => {
    expect(
      inferLinkedSectionIdsFromSite({
        id: "vaucresson",
        slots: [{ id: "vau-lun-1900-handisport", label: "Lundi / Handisport" }],
      })
    ).toEqual(["handisport"]);
  });

  it("lie Voisins → section voisins + handisport si créneau handisport", () => {
    const linked = inferLinkedSectionIdsFromSite({
      id: "voisins",
      slots: [
        { id: "voisins-mar-1830-handisport", label: "Mardi / Handisport" },
        { id: "voisins-sam-1000-tous-publics", label: "Samedi / Tous publics" },
      ],
    });
    expect(linked).toEqual(expect.arrayContaining(["voisins", "handisport"]));
    expect(linked).toHaveLength(2);
  });

  it("lie Villepreux → section villepreux + sport adapté", () => {
    const linked = inferLinkedSectionIdsFromSite({
      id: "villepreux",
      slots: [{ id: "villepreux-jeu-1030-sport-adapte", label: "Jeudi / Sport Adapté" }],
    });
    expect(linked).toEqual(expect.arrayContaining(["villepreux", "sport-adapte"]));
    expect(linked).toHaveLength(2);
  });
});

describe("repairSiteLinkedSectionIds", () => {
  it("répare vaucresson lié à lui-même", () => {
    const config = buildDefaultRegistrationConfig();
    const broken = {
      ...config,
      sites: config.sites.map((site) =>
        site.id === "vaucresson" ? { ...site, linkedSectionIds: ["vaucresson"] } : site
      ),
    };

    const repaired = repairSiteLinkedSectionIds(broken);
    const vaucresson = repaired.sites.find((site) => site.id === "vaucresson");
    expect(vaucresson?.linkedSectionIds).toEqual(["handisport"]);
    expect(validateRegistrationConfigCrossRefs(repaired)).toEqual([]);
  });
});

describe("seed par défaut", () => {
  it("n'a aucune liaison site → section invalide", () => {
    const config = buildDefaultRegistrationConfig();
    expect(validateRegistrationConfigCrossRefs(config)).toEqual([]);

    const vaucresson = config.sites.find((site) => site.id === "vaucresson");
    expect(vaucresson?.linkedSectionIds).toEqual(["handisport"]);

    const voisins = config.sites.find((site) => site.id === "voisins");
    expect(voisins?.linkedSectionIds).toEqual(
      expect.arrayContaining(["voisins", "handisport"])
    );

    const villepreux = config.sites.find((site) => site.id === "villepreux");
    expect(villepreux?.linkedSectionIds).toEqual(
      expect.arrayContaining(["villepreux", "sport-adapte"])
    );
  });
});
