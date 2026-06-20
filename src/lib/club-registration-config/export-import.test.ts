import { buildDefaultRegistrationConfig } from "./default-config";
import { normalizeRegistrationConfigSortOrders } from "./normalize-sort-orders";
import { registrationConfigV1Schema } from "./schema";
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
    }
  });
});
