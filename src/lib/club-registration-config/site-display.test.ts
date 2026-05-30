import { getDefaultRegistrationConfig } from "./default-config";
import {
  formatRegistrationSiteLabel,
  formatSectionPracticeLabel,
  listGymnasiumNamesForSection,
  registrationSiteGymnasiumLabel,
} from "./site-display";

describe("site-display", () => {
  it("affiche le gymnase quand il est renseigné", () => {
    expect(
      formatRegistrationSiteLabel({
        label: "Villepreux",
        gymnasiumName: "Gymnase Jean Rostand",
      })
    ).toBe("Villepreux — Gymnase Jean Rostand");
  });

  it("n'affiche que le lieu sans gymnase", () => {
    expect(formatRegistrationSiteLabel({ label: "Villepreux" })).toBe("Villepreux");
    expect(registrationSiteGymnasiumLabel({ label: "Villepreux" })).toBeNull();
  });

  it("associe le gymnase du lieu à la section du même id", () => {
    const config = getDefaultRegistrationConfig();
    const sites = config.sites.map((site) =>
      site.id === "villepreux"
        ? { ...site, gymnasiumName: "Gymnase Jean Rostand" }
        : site
    );
    const withGym = { ...config, sites };
    expect(listGymnasiumNamesForSection(withGym, "villepreux")).toEqual([
      "Gymnase Jean Rostand",
    ]);
    expect(formatSectionPracticeLabel(withGym, { id: "villepreux", label: "Villepreux" })).toBe(
      "Villepreux — Gymnase Jean Rostand"
    );
  });

  it("associe le gymnase d’un lieu lié à handisport", () => {
    const config = getDefaultRegistrationConfig();
    const sites = config.sites.map((site) =>
      site.id === "vaucresson"
        ? { ...site, gymnasiumName: "Gymnase de Vaucresson" }
        : site
    );
    const withGym = { ...config, sites };
    expect(listGymnasiumNamesForSection(withGym, "handisport")).toEqual([
      "Gymnase de Vaucresson",
    ]);
  });
});
