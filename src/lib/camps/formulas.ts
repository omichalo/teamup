import { LEGACY_FORMULA_META, type CampPricingMode } from "./constants";
import type { Camp, CampFormulaConfig, CampSiteConfig } from "./types";

/** Id de formule sur un stage : unique par site (même formule catalogue réutilisable). */
export function campFormulaInstanceId(
  siteId: string,
  catalogFormulaId: string
): string {
  return `${siteId}__${catalogFormulaId}`;
}

/** Clé UI site+formule (sélection inscription). */
export function campFormulaSelectionKey(
  siteId: string,
  formulaId: string
): string {
  return `${siteId}::${formulaId}`;
}

export function parseCampFormulaSelection(
  key: string
): { siteId: string; formulaId: string } | null {
  const sep = key.indexOf("::");
  if (sep <= 0 || sep >= key.length - 2) return null;
  return {
    siteId: key.slice(0, sep),
    formulaId: key.slice(sep + 2),
  };
}

export function findCampFormula(
  camp: Pick<Camp, "sites">,
  formulaId: string,
  siteId?: string
): CampFormulaConfig | null {
  if (siteId) {
    const site = camp.sites.find((s) => s.id === siteId);
    return site?.formulas.find((f) => f.id === formulaId) ?? null;
  }
  for (const site of camp.sites) {
    const found = site.formulas.find((f) => f.id === formulaId);
    if (found) return found;
  }
  return null;
}

export function listCampFormulas(camp: Pick<Camp, "sites">): Array<
  CampFormulaConfig & { siteId: string; siteLabel: string }
> {
  return camp.sites.flatMap((site) =>
    site.formulas.map((formula) => ({
      ...formula,
      siteId: site.id,
      siteLabel: site.label,
    }))
  );
}

export function resolvePricingMode(
  camp: Pick<Camp, "sites">,
  formulaId: string,
  siteId?: string
): CampPricingMode {
  const formula = findCampFormula(camp, formulaId, siteId);
  if (formula) return formula.pricingMode;
  return LEGACY_FORMULA_META[formulaId]?.pricingMode ?? "day_week";
}

export function formulaDisplayLabel(
  camp: Pick<Camp, "sites"> | null | undefined,
  formulaId: string,
  storedLabel?: string | null
): string {
  if (storedLabel && storedLabel.trim()) return storedLabel.trim();
  if (camp) {
    const formula = findCampFormula(camp, formulaId);
    if (formula) return formula.label;
  }
  return LEGACY_FORMULA_META[formulaId]?.label ?? formulaId;
}

/** Normalise sites Firestore (nouveau + legacy formulaIds/schedules). */
export function normalizeSiteConfig(raw: unknown): CampSiteConfig {
  const data = (raw ?? {}) as Record<string, unknown>;
  const id = String(data.id ?? "");
  const label = String(data.label ?? "");

  const catalogSiteId =
    typeof data.catalogSiteId === "string" && data.catalogSiteId.trim()
      ? data.catalogSiteId.trim()
      : undefined;

  if (Array.isArray(data.formulas)) {
    return {
      id,
      ...(catalogSiteId ? { catalogSiteId } : {}),
      label,
      formulas: data.formulas.map((item) => normalizeFormula(item)),
    };
  }

  const formulaIds = Array.isArray(data.formulaIds)
    ? (data.formulaIds as string[])
    : [];
  const schedules =
    data.schedules && typeof data.schedules === "object"
      ? (data.schedules as Record<string, unknown>)
      : {};

  return {
    id,
    label,
    formulas: formulaIds.map((formulaId) => {
      const meta = LEGACY_FORMULA_META[formulaId];
      const sessionsRaw = schedules[formulaId];
      return {
        id: formulaId,
        label: meta?.label ?? formulaId,
        pricingMode: meta?.pricingMode ?? "day_week",
        sessions: Array.isArray(sessionsRaw)
          ? sessionsRaw.map((s) => normalizeSession(s))
          : [],
      };
    }),
  };
}

function normalizeFormula(raw: unknown): CampFormulaConfig {
  const data = (raw ?? {}) as Record<string, unknown>;
  const pricingMode =
    data.pricingMode === "session" || data.pricingMode === "day_week"
      ? data.pricingMode
      : "day_week";
  const catalogFormulaId =
    typeof data.catalogFormulaId === "string" && data.catalogFormulaId.trim()
      ? data.catalogFormulaId.trim()
      : undefined;
  return {
    id: String(data.id ?? ""),
    ...(catalogFormulaId ? { catalogFormulaId } : {}),
    label: String(data.label ?? ""),
    pricingMode,
    sessions: Array.isArray(data.sessions)
      ? data.sessions.map((s) => normalizeSession(s))
      : [],
  };
}

function normalizeSession(raw: unknown): CampFormulaConfig["sessions"][number] {
  const data = (raw ?? {}) as Record<string, unknown>;
  return {
    label: String(data.label ?? ""),
    startMinutes: Number(data.startMinutes ?? 0),
    endMinutes: Number(data.endMinutes ?? 0),
  };
}
