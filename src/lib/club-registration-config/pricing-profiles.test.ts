import { getDefaultRegistrationConfig } from "./default-config";
import {
  buildDefaultPricingProfilesRecord,
  isClassicLikePricingProfile,
  listPricingProfiles,
  repairPricingProfiles,
} from "./pricing-profiles";

describe("pricing-profiles", () => {
  it("répare une config sans bloc pricingProfiles", () => {
    const config = getDefaultRegistrationConfig();
    const legacy = { ...config, pricingProfiles: undefined } as typeof config;
    const repaired = repairPricingProfiles(legacy);
    expect(Object.keys(repaired.pricingProfiles)).toContain("classic");
    expect(Object.keys(repaired.pricingProfiles)).toContain("ecole");
  });

  it("expose les profils par défaut avec école", () => {
    const defs = buildDefaultPricingProfilesRecord();
    expect(defs.ecole.label).toBe("École de ping");
    expect(defs.ecole.behavior).toBe("classic_like");
  });

  it("dérive le comportement depuis la config", () => {
    const config = getDefaultRegistrationConfig();
    expect(isClassicLikePricingProfile(config, "ecole")).toBe(true);
    expect(listPricingProfiles(config).length).toBeGreaterThanOrEqual(4);
  });

  it("migre practiceLevel handisport vers wantsCompetitorExtras", () => {
    const config = getDefaultRegistrationConfig();
    const legacy = {
      ...config,
      rateTable: config.rateTable.map((entry) =>
        entry.id === "handisport_leisure"
          ? {
              ...entry,
              match: {
                pricingProfile: "handisport" as const,
                practiceLevel: "leisure" as const,
              },
            }
          : entry
      ),
    };
    const repaired = repairPricingProfiles(legacy);
    const leisure = repaired.rateTable.find((e) => e.id === "handisport_leisure");
    expect(leisure?.match.practiceLevel).toBeUndefined();
    expect(leisure?.match.wantsCompetitorExtras).toBe(false);
  });
});
