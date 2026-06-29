import { getDefaultRegistrationConfig } from "./default-config";
import { CHAMP_YON_PRICING_PROFILE_ID } from "./pricing-devices";
import type { RegistrationConfigV1 } from "./types";

/** Réinjecte le profil CHAMP'YON (grille + tranches d'âge) si absent d'une config legacy. */
export function repairChampYonCatalog(config: RegistrationConfigV1): RegistrationConfigV1 {
  const defaults = getDefaultRegistrationConfig();
  const defaultProfile = defaults.pricingProfiles[CHAMP_YON_PRICING_PROFILE_ID];
  const defaultAgeProfile = defaults.ageBandProfiles[CHAMP_YON_PRICING_PROFILE_ID];
  const defaultRates = defaults.rateTable.filter(
    (entry) => entry.match.pricingProfile === CHAMP_YON_PRICING_PROFILE_ID
  );

  if (!defaultProfile || !defaultAgeProfile || defaultRates.length === 0) {
    return config;
  }

  const pricingProfiles = { ...config.pricingProfiles };
  if (!pricingProfiles[CHAMP_YON_PRICING_PROFILE_ID]) {
    pricingProfiles[CHAMP_YON_PRICING_PROFILE_ID] = defaultProfile;
  }

  const ageBandProfiles = { ...config.ageBandProfiles };
  if (!ageBandProfiles[CHAMP_YON_PRICING_PROFILE_ID]) {
    ageBandProfiles[CHAMP_YON_PRICING_PROFILE_ID] = defaultAgeProfile;
  }

  const existingRateIds = new Set(config.rateTable.map((entry) => entry.id));
  const rateTable = config.rateTable.map((entry) => {
    const defaultEntry = defaultRates.find((candidate) => candidate.id === entry.id);
    if (
      defaultEntry &&
      entry.match.pricingProfile === CHAMP_YON_PRICING_PROFILE_ID
    ) {
      return {
        ...entry,
        licenseCents: defaultEntry.licenseCents,
        membershipCents: defaultEntry.membershipCents,
      };
    }
    return entry;
  });
  for (const entry of defaultRates) {
    if (!existingRateIds.has(entry.id)) {
      rateTable.push(entry);
    }
  }

  return {
    ...config,
    pricingProfiles,
    ageBandProfiles,
    rateTable,
  };
}
