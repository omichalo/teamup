import { buildDefaultRegistrationConfig } from "./default-config";
import { normalizeRegistrationConfigSortOrders } from "./normalize-sort-orders";
import { registrationConfigV1Schema } from "./schema";
import { applySlotEnrollmentsClosed } from "./slot-enrollments";
import { validateRegistrationConfigCrossRefs } from "./validate-config";
import {
  buildConfigExport,
  parseConfigExportFile,
  serializeConfigExport,
} from "./export-import";

describe("registration config schema", () => {
  it("valide la config par défaut", () => {
    const config = buildDefaultRegistrationConfig();
    const issues = validateRegistrationConfigCrossRefs(config);
    expect(issues).toEqual([]);
  });

  it("accepte un gymnase vide sur un lieu", () => {
    const config = buildDefaultRegistrationConfig();
    const sites = config.sites.map((site, index) =>
      index === 0 ? { ...site, gymnasiumName: "" } : site
    );
    const parsed = registrationConfigV1Schema.safeParse({ ...config, sites });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.sites[0]?.gymnasiumName).toBeUndefined();
      const normalized = normalizeRegistrationConfigSortOrders(parsed.data);
      expect(normalized.sites[0]).not.toHaveProperty("gymnasiumName");
    }
  });

  it("accepte une capacité entière >= 1 sur un créneau", () => {
    const config = buildDefaultRegistrationConfig();
    const sites = config.sites.map((site, index) =>
      index === 0
        ? {
            ...site,
            slots: site.slots.map((slot, slotIndex) =>
              slotIndex === 0 ? { ...slot, capacity: 24 } : slot
            ),
          }
        : site
    );
    const parsed = registrationConfigV1Schema.safeParse({ ...config, sites });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.sites[0]?.slots[0]?.capacity).toBe(24);
    }
  });

  it("rejette une capacité nulle, décimale ou trop grande", () => {
    const config = buildDefaultRegistrationConfig();
    const withCapacity = (capacity: number) => {
      const sites = config.sites.map((site, index) =>
        index === 0
          ? {
              ...site,
              slots: site.slots.map((slot, slotIndex) =>
                slotIndex === 0 ? { ...slot, capacity } : slot
              ),
            }
          : site
      );
      return registrationConfigV1Schema.safeParse({ ...config, sites });
    };
    expect(withCapacity(0).success).toBe(false);
    expect(withCapacity(1.5).success).toBe(false);
    expect(withCapacity(501).success).toBe(false);
  });

  it("accepte et normalise la fermeture des adhésions d'un créneau", () => {
    const config = buildDefaultRegistrationConfig();
    const slotId = config.sites[0]?.slots[0]?.id;
    expect(slotId).toBeTruthy();
    if (!slotId) {
      return;
    }
    const closed = applySlotEnrollmentsClosed(config, slotId, true);
    expect(closed).not.toBeNull();
    const parsed = registrationConfigV1Schema.safeParse(closed);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.sites[0]?.slots[0]?.enrollmentsClosed).toBe(true);
      const reopened = applySlotEnrollmentsClosed(parsed.data, slotId, false);
      expect(reopened).not.toBeNull();
      if (reopened) {
        const normalized = normalizeRegistrationConfigSortOrders(reopened);
        expect(normalized.sites[0]?.slots[0]?.enrollmentsClosed).toBeUndefined();
      }
    }
  });
});

describe("export / import round-trip", () => {
  it("sérialise et réimporte la config par défaut", () => {
    const config = buildDefaultRegistrationConfig();
    const raw = JSON.parse(serializeConfigExport(config));
    const result = parseConfigExportFile(raw);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.meta.catalogVersion).toBe(config.meta.catalogVersion);
      expect(buildConfigExport(result.config).schemaVersion).toBe("1.0.0");
      const firstSlot = result.config.sites[0]?.slots[0];
      expect(firstSlot?.weekday).toBeDefined();
      expect(firstSlot?.startMinutes).toBeDefined();
      expect(firstSlot?.endMinutes).toBeDefined();
    }
  });
});
