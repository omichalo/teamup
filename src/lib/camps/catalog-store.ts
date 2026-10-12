import type { DocumentData, Firestore } from "firebase-admin/firestore";
import { CAMP_COLLECTIONS } from "./constants";
import type {
  CatalogFormulaCreateInput,
  CatalogPricingCreateInput,
  CatalogSiteCreateInput,
} from "./catalog-schema";
import { campFormulaInstanceId } from "./formulas";
import type {
  CampCatalogFormula,
  CampCatalogPricing,
  CampCatalogSite,
  CampFormulaConfig,
  CampPricingRates,
  CampSiteConfig,
  CampSessionTemplate,
} from "./types";

function asRecord(data: DocumentData | undefined): Record<string, unknown> {
  return data ?? {};
}

function mapCatalogSite(id: string, data: Record<string, unknown>): CampCatalogSite {
  return {
    id,
    label: String(data.label ?? ""),
    active: data.active !== false,
    createdAt: String(data.createdAt ?? ""),
    updatedAt: String(data.updatedAt ?? ""),
  };
}

function mapCatalogFormula(
  id: string,
  data: Record<string, unknown>
): CampCatalogFormula {
  const sessions = Array.isArray(data.sessions)
    ? (data.sessions as CampSessionTemplate[])
    : [];
  const catalogSiteIds = Array.isArray(data.catalogSiteIds)
    ? data.catalogSiteIds.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
  return {
    id,
    label: String(data.label ?? ""),
    pricingMode: data.pricingMode === "session" ? "session" : "day_week",
    sessions,
    catalogSiteIds,
    active: data.active !== false,
    createdAt: String(data.createdAt ?? ""),
    updatedAt: String(data.updatedAt ?? ""),
  };
}

function mapPricingRates(raw: unknown): CampPricingRates {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  return {
    memberDayCents: Number(data.memberDayCents ?? 0),
    memberWeekCents: Number(data.memberWeekCents ?? 0),
    nonMemberDayCents: Number(data.nonMemberDayCents ?? 0),
    nonMemberWeekCents: Number(data.nonMemberWeekCents ?? 0),
    session2hCents: Number(data.session2hCents ?? 0),
    twoSessionsSameDayCents: Number(data.twoSessionsSameDayCents ?? 0),
  };
}

function mapCatalogPricing(
  id: string,
  data: Record<string, unknown>
): CampCatalogPricing {
  return {
    id,
    label: String(data.label ?? ""),
    rates: mapPricingRates(data.rates),
    active: data.active !== false,
    createdAt: String(data.createdAt ?? ""),
    updatedAt: String(data.updatedAt ?? ""),
  };
}

export async function listCatalogSites(db: Firestore): Promise<CampCatalogSite[]> {
  const snap = await db.collection(CAMP_COLLECTIONS.catalogSites).get();
  return snap.docs
    .map((doc) => mapCatalogSite(doc.id, asRecord(doc.data())))
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));
}

export async function createCatalogSite(
  db: Firestore,
  input: CatalogSiteCreateInput
): Promise<CampCatalogSite> {
  const now = new Date().toISOString();
  const ref = db.collection(CAMP_COLLECTIONS.catalogSites).doc();
  const data = {
    label: input.label,
    active: input.active ?? true,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(data);
  return mapCatalogSite(ref.id, data);
}

export async function updateCatalogSite(
  db: Firestore,
  siteId: string,
  patch: { label?: string | undefined; active?: boolean | undefined }
): Promise<CampCatalogSite | null> {
  const ref = db.collection(CAMP_COLLECTIONS.catalogSites).doc(siteId);
  const existing = await ref.get();
  if (!existing.exists) return null;
  const now = new Date().toISOString();
  await ref.update({ ...patch, updatedAt: now });
  const updated = await ref.get();
  return mapCatalogSite(updated.id, asRecord(updated.data()));
}

export async function deleteCatalogSite(
  db: Firestore,
  siteId: string
): Promise<boolean> {
  const ref = db.collection(CAMP_COLLECTIONS.catalogSites).doc(siteId);
  const existing = await ref.get();
  if (!existing.exists) return false;
  await ref.delete();
  return true;
}

export async function listCatalogFormulas(
  db: Firestore
): Promise<CampCatalogFormula[]> {
  const snap = await db.collection(CAMP_COLLECTIONS.catalogFormulas).get();
  return snap.docs
    .map((doc) => mapCatalogFormula(doc.id, asRecord(doc.data())))
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));
}

export async function createCatalogFormula(
  db: Firestore,
  input: CatalogFormulaCreateInput
): Promise<CampCatalogFormula> {
  const now = new Date().toISOString();
  const ref = db.collection(CAMP_COLLECTIONS.catalogFormulas).doc();
  const data = {
    label: input.label,
    pricingMode: input.pricingMode,
    sessions: input.sessions,
    catalogSiteIds: input.catalogSiteIds ?? [],
    active: input.active ?? true,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(data);
  return mapCatalogFormula(ref.id, data);
}

export async function updateCatalogFormula(
  db: Firestore,
  formulaId: string,
  patch: {
    label?: string | undefined;
    pricingMode?: CatalogFormulaCreateInput["pricingMode"] | undefined;
    sessions?: CatalogFormulaCreateInput["sessions"] | undefined;
    catalogSiteIds?: string[] | undefined;
    active?: boolean | undefined;
  }
): Promise<CampCatalogFormula | null> {
  const ref = db.collection(CAMP_COLLECTIONS.catalogFormulas).doc(formulaId);
  const existing = await ref.get();
  if (!existing.exists) return null;
  const now = new Date().toISOString();
  await ref.update({ ...patch, updatedAt: now });
  const updated = await ref.get();
  return mapCatalogFormula(updated.id, asRecord(updated.data()));
}

export async function deleteCatalogFormula(
  db: Firestore,
  formulaId: string
): Promise<boolean> {
  const ref = db.collection(CAMP_COLLECTIONS.catalogFormulas).doc(formulaId);
  const existing = await ref.get();
  if (!existing.exists) return false;
  await ref.delete();
  return true;
}

export async function listCatalogPricings(
  db: Firestore
): Promise<CampCatalogPricing[]> {
  const snap = await db.collection(CAMP_COLLECTIONS.catalogPricings).get();
  return snap.docs
    .map((doc) => mapCatalogPricing(doc.id, asRecord(doc.data())))
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));
}

export async function createCatalogPricing(
  db: Firestore,
  input: CatalogPricingCreateInput
): Promise<CampCatalogPricing> {
  const now = new Date().toISOString();
  const ref = db.collection(CAMP_COLLECTIONS.catalogPricings).doc();
  const data = {
    label: input.label,
    rates: input.rates,
    active: input.active ?? true,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(data);
  return mapCatalogPricing(ref.id, data);
}

export async function updateCatalogPricing(
  db: Firestore,
  pricingId: string,
  patch: {
    label?: string | undefined;
    rates?: CatalogPricingCreateInput["rates"] | undefined;
    active?: boolean | undefined;
  }
): Promise<CampCatalogPricing | null> {
  const ref = db.collection(CAMP_COLLECTIONS.catalogPricings).doc(pricingId);
  const existing = await ref.get();
  if (!existing.exists) return null;
  const now = new Date().toISOString();
  await ref.update({ ...patch, updatedAt: now });
  const updated = await ref.get();
  return mapCatalogPricing(updated.id, asRecord(updated.data()));
}

export async function deleteCatalogPricing(
  db: Firestore,
  pricingId: string
): Promise<boolean> {
  const ref = db.collection(CAMP_COLLECTIONS.catalogPricings).doc(pricingId);
  const existing = await ref.get();
  if (!existing.exists) return false;
  await ref.delete();
  return true;
}

export async function getCatalogPricing(
  db: Firestore,
  pricingId: string
): Promise<CampCatalogPricing | null> {
  const doc = await db
    .collection(CAMP_COLLECTIONS.catalogPricings)
    .doc(pricingId)
    .get();
  if (!doc.exists) return null;
  return mapCatalogPricing(doc.id, asRecord(doc.data()));
}

export async function getCatalogSitesByIds(
  db: Firestore,
  ids: string[]
): Promise<Map<string, CampCatalogSite>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, CampCatalogSite>();
  if (unique.length === 0) return map;
  const refs = unique.map((id) =>
    db.collection(CAMP_COLLECTIONS.catalogSites).doc(id)
  );
  const docs = await db.getAll(...refs);
  for (const doc of docs) {
    if (doc.exists) {
      map.set(doc.id, mapCatalogSite(doc.id, asRecord(doc.data())));
    }
  }
  return map;
}

export async function getCatalogFormulasByIds(
  db: Firestore,
  ids: string[]
): Promise<Map<string, CampCatalogFormula>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, CampCatalogFormula>();
  if (unique.length === 0) return map;
  const refs = unique.map((id) =>
    db.collection(CAMP_COLLECTIONS.catalogFormulas).doc(id)
  );
  const docs = await db.getAll(...refs);
  for (const doc of docs) {
    if (doc.exists) {
      map.set(doc.id, mapCatalogFormula(doc.id, asRecord(doc.data())));
    }
  }
  return map;
}

/** Construit les sites de stage (snapshots) depuis des assignations catalogue. */
export async function buildCampSitesFromCatalogAssignments(
  db: Firestore,
  assignments: Array<{ catalogSiteId: string; catalogFormulaIds: string[] }>
): Promise<
  | { ok: true; sites: CampSiteConfig[] }
  | { ok: false; error: string }
> {
  const siteIds = assignments.map((a) => a.catalogSiteId);
  const formulaIds = assignments.flatMap((a) => a.catalogFormulaIds);
  const [sitesMap, formulasMap] = await Promise.all([
    getCatalogSitesByIds(db, siteIds),
    getCatalogFormulasByIds(db, formulaIds),
  ]);

  const sites: CampSiteConfig[] = [];
  for (const assignment of assignments) {
    const site = sitesMap.get(assignment.catalogSiteId);
    if (!site || !site.active) {
      return {
        ok: false,
        error: `Site catalogue introuvable ou inactif : ${assignment.catalogSiteId}`,
      };
    }
    const formulas: CampFormulaConfig[] = [];
    for (const formulaId of assignment.catalogFormulaIds) {
      const formula = formulasMap.get(formulaId);
      if (!formula || !formula.active) {
        return {
          ok: false,
          error: `Formule catalogue introuvable ou inactive : ${formulaId}`,
        };
      }
      if (formula.sessions.length === 0) {
        return {
          ok: false,
          error: `La formule « ${formula.label} » n’a aucun horaire.`,
        };
      }
      formulas.push({
        id: campFormulaInstanceId(site.id, formula.id),
        catalogFormulaId: formula.id,
        label: formula.label,
        pricingMode: formula.pricingMode,
        sessions: formula.sessions.map((s) => ({ ...s })),
      });
    }
    sites.push({
      id: site.id,
      catalogSiteId: site.id,
      label: site.label,
      formulas,
    });
  }
  return { ok: true, sites };
}
