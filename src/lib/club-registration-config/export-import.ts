import { REGISTRATION_CONFIG_SCHEMA_VERSION } from "./types";
import type { RegistrationConfigExport, RegistrationConfigV1 } from "./types";
import { registrationConfigExportSchema, registrationConfigV1Schema } from "./schema";
import { validateRegistrationConfigCrossRefs } from "./validate-config";
import { normalizeRegistrationConfigSortOrders } from "./normalize-sort-orders";

export function buildConfigExport(config: RegistrationConfigV1): RegistrationConfigExport {
  return {
    schemaVersion: REGISTRATION_CONFIG_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    config,
  };
}

export function serializeConfigExport(config: RegistrationConfigV1): string {
  return JSON.stringify(buildConfigExport(config), null, 2);
}

export type ImportConfigResult =
  | { ok: true; config: RegistrationConfigV1 }
  | { ok: false; errors: string[] };

export function parseConfigImport(raw: unknown): ImportConfigResult {
  const errors: string[] = [];

  if (typeof raw !== "object" || raw === null) {
    return { ok: false, errors: ["Le fichier importé n'est pas un objet JSON valide."] };
  }

  const payload = raw as Record<string, unknown>;
  const configCandidate =
    "config" in payload && payload.config !== undefined ? payload.config : payload;

  const parsed = registrationConfigV1Schema.safeParse(configCandidate);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`${issue.path.join(".") || "config"} : ${issue.message}`);
    }
    return { ok: false, errors };
  }

  const crossRefIssues = validateRegistrationConfigCrossRefs(parsed.data);
  for (const issue of crossRefIssues) {
    errors.push(`${issue.path} : ${issue.message}`);
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, config: normalizeRegistrationConfigSortOrders(parsed.data as RegistrationConfigV1) };
}

export function parseConfigExportFile(raw: unknown): ImportConfigResult {
  const exportParsed = registrationConfigExportSchema.safeParse(raw);
  if (exportParsed.success) {
    const crossRefIssues = validateRegistrationConfigCrossRefs(exportParsed.data.config);
    if (crossRefIssues.length > 0) {
      return {
        ok: false,
        errors: crossRefIssues.map((i) => `${i.path} : ${i.message}`),
      };
    }
    return { ok: true, config: exportParsed.data.config as RegistrationConfigV1 };
  }

  return parseConfigImport(raw);
}

export function downloadConfigBlob(config: RegistrationConfigV1, filename?: string): void {
  const blob = new Blob([serializeConfigExport(config)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download =
    filename ??
    `inscription-club-${config.meta.catalogVersion}-${new Date().toISOString().slice(0, 10)}.teamup-registration-config.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
