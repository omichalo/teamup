import { getAllSlotIds } from "./helpers";
import { sortBySortOrder } from "./sort-order";
import type { PricingDevice, RegistrationConfigV1 } from "./types";
import type { PricingContext } from "@/lib/pricing/types";

export const CHAMP_YON_DEVICE_ID = "champ-yon" as const;
export const CHAMP_YON_PRICING_PROFILE_ID = "champ_yon" as const;

export function buildDefaultChampYonDevice(): PricingDevice {
  return {
    id: CHAMP_YON_DEVICE_ID,
    label: "DISPOSITIF CLUB CHAMP'YON",
    enabled: true,
    sortOrder: 0,
    priority: 10,
    builtIn: true,
    conditions: {
      sectionIds: ["trappes", "la-verriere"],
      exactSlotCount: 1,
      requiresNoAdditionalSections: true,
      requiresNoCompetitorExtras: true,
      requiresNoCompetitionSelection: true,
    },
    pricingProfileId: CHAMP_YON_PRICING_PROFILE_ID,
    ageBandProfileId: CHAMP_YON_PRICING_PROFILE_ID,
    stackableWithDiscounts: false,
    includesFfttLicense: false,
    uiCopy: {
      recapHint:
        "Tarif CHAMP'YON appliqué (1 section, 1 créneau, pratique loisir sans compétition).",
      adminBadge: "CHAMP'YON",
      segmentLabelPrefix: "CHAMP'YON —",
    },
  };
}

export function buildDefaultPricingDevices(): PricingDevice[] {
  return [buildDefaultChampYonDevice()];
}

export function repairPricingDevices(config: RegistrationConfigV1): RegistrationConfigV1 {
  const existing = config.pricingDevices ?? [];
  const existingIds = new Set(existing.map((device) => device.id));
  const merged = [...existing];

  for (const builtIn of buildDefaultPricingDevices()) {
    if (builtIn.builtIn && !existingIds.has(builtIn.id)) {
      merged.push(builtIn);
    }
  }

  return {
    ...config,
    pricingDevices: sortBySortOrder(merged).map((device, index) => {
      const builtInDefault = buildDefaultPricingDevices().find(
        (candidate) => candidate.id === device.id && candidate.builtIn
      );
      return {
        ...device,
        sortOrder: index,
        includesFfttLicense:
          device.includesFfttLicense ?? builtInDefault?.includesFfttLicense ?? true,
      };
    }),
  };
}

export function evaluatePricingDeviceConditions(
  device: PricingDevice,
  ctx: PricingContext,
  config: RegistrationConfigV1
): boolean {
  if (!device.enabled) {
    return false;
  }

  const { conditions } = device;

  if (!conditions.sectionIds.includes(ctx.mainSectionId)) {
    return false;
  }

  if (conditions.requiresNoAdditionalSections) {
    if ((ctx.additionalSectionIds?.length ?? 0) > 0) {
      return false;
    }
  }

  const slotIds = ctx.slotIds ?? [];
  if (slotIds.length !== conditions.exactSlotCount) {
    return false;
  }

  if (conditions.exactSlotCount > 0) {
    const validSlotIds = getAllSlotIds(config);
    for (const slotId of slotIds) {
      if (!validSlotIds.has(slotId)) {
        return false;
      }
    }
  }

  if (conditions.requiresNoCompetitorExtras && ctx.wantsCompetitorExtras) {
    return false;
  }

  if (conditions.requiresNoCompetitionSelection && ctx.competitionIds.length > 0) {
    return false;
  }

  return true;
}

export function resolveActivePricingDevice(
  ctx: PricingContext,
  config: RegistrationConfigV1
): PricingDevice | null {
  const devices = sortBySortOrder(config.pricingDevices ?? []);
  const sorted = [...devices].sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return a.sortOrder - b.sortOrder;
  });

  for (const device of sorted) {
    if (evaluatePricingDeviceConditions(device, ctx, config)) {
      return device;
    }
  }

  return null;
}

export function formatSegmentLabelWithDevice(
  segmentLabel: string,
  device: PricingDevice | null
): string {
  const prefix = device?.uiCopy?.segmentLabelPrefix?.trim();
  if (!prefix) {
    return segmentLabel;
  }
  return `${prefix} ${segmentLabel}`;
}
