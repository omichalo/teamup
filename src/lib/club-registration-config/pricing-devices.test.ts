import { buildDefaultRegistrationConfig } from "./default-config";
import {
  CHAMP_YON_DEVICE_ID,
  evaluatePricingDeviceConditions,
  resolveActivePricingDevice,
} from "./pricing-devices";
import type { PricingContext } from "@/lib/pricing/types";

const config = buildDefaultRegistrationConfig();
const PRICING_DATE = "2025-09-01";

function ctx(
  patch: Partial<PricingContext> & Pick<PricingContext, "birthDate">
): PricingContext {
  return {
    mainSectionId: "trappes",
    slotIds: ["trappes-mer-1730-jeunes-loisir-compet"],
    additionalSectionIds: [],
    wantsCompetitorExtras: false,
    wantsOptionalJersey: false,
    competitionIds: [],
    familyRegistrationOrder: "none",
    sex: "male",
    pricingDate: PRICING_DATE,
    ...patch,
  };
}

describe("resolveActivePricingDevice — CHAMP'YON", () => {
  it("s'applique pour Trappes, 1 créneau, loisir sans compétition", () => {
    const device = resolveActivePricingDevice(ctx({ birthDate: "2014-06-01" }), config);
    expect(device?.id).toBe(CHAMP_YON_DEVICE_ID);
  });

  it("s'applique pour La Verrière dans les mêmes conditions", () => {
    const device = resolveActivePricingDevice(
      ctx({
        birthDate: "2014-06-01",
        mainSectionId: "la-verriere",
        slotIds: ["lv-jeu-1800-jeunes-loisirs"],
      }),
      config
    );
    expect(device?.id).toBe(CHAMP_YON_DEVICE_ID);
  });

  it("ne s'applique pas avec 2 créneaux", () => {
    const device = resolveActivePricingDevice(
      ctx({
        birthDate: "2014-06-01",
        slotIds: ["trappes-mer-1730-jeunes-loisir-compet", "lv-jeu-1800-jeunes-loisirs"],
      }),
      config
    );
    expect(device).toBeNull();
  });

  it("ne s'applique pas avec une section complémentaire", () => {
    const device = resolveActivePricingDevice(
      ctx({
        birthDate: "2014-06-01",
        additionalSectionIds: ["voisins"],
      }),
      config
    );
    expect(device).toBeNull();
  });

  it("ne s'applique pas en mode compétiteur", () => {
    const device = resolveActivePricingDevice(
      ctx({ birthDate: "2014-06-01", wantsCompetitorExtras: true }),
      config
    );
    expect(device).toBeNull();
  });

  it("ne s'applique pas avec une compétition cochée", () => {
    const device = resolveActivePricingDevice(
      ctx({ birthDate: "2014-06-01", competitionIds: ["championnat_paris"] }),
      config
    );
    expect(device).toBeNull();
  });

  it("ne s'applique pas pour une autre section", () => {
    const device = resolveActivePricingDevice(
      ctx({ birthDate: "2014-06-01", mainSectionId: "voisins", slotIds: ["voisins-lun-1730-jeunes-loisirs"] }),
      config
    );
    expect(device).toBeNull();
  });

  it("ne s'applique pas sans créneau", () => {
    const device = resolveActivePricingDevice(
      ctx({ birthDate: "2014-06-01", slotIds: [] }),
      config
    );
    expect(device).toBeNull();
  });
});

describe("evaluatePricingDeviceConditions", () => {
  it("ignore un dispositif désactivé", () => {
    const device = config.pricingDevices.find((d) => d.id === CHAMP_YON_DEVICE_ID);
    expect(device).toBeDefined();
    if (!device) return;

    expect(
      evaluatePricingDeviceConditions(
        { ...device, enabled: false },
        ctx({ birthDate: "2014-06-01" }),
        config
      )
    ).toBe(false);
  });
});
