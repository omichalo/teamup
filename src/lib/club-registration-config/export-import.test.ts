import { buildDefaultRegistrationConfig } from "./default-config";
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
