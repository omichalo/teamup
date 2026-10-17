import type {
  DocumentData,
  DocumentReference,
  Firestore,
} from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { normalizeCampAttendanceMark } from "./attendance-mark";
import { CAMP_COLLECTIONS } from "./constants";
import type { CampCreateInput } from "./schema";
import { LEGACY_FORMULA_META } from "./constants";
import { normalizeSiteConfig } from "./formulas";
import type {
  Camp,
  CampAttendanceMark,
  CampListItem,
  CampRegistration,
  CampSlot,
} from "./types";

function asRecord(data: DocumentData | undefined): Record<string, unknown> {
  return data ?? {};
}

function mapCamp(id: string, data: Record<string, unknown>): Camp {
  return {
    id,
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    seasonLabel: String(data.seasonLabel ?? ""),
    status: data.status as Camp["status"],
    registrationOpensAt:
      typeof data.registrationOpensAt === "string" ? data.registrationOpensAt : null,
    registrationClosesAt:
      typeof data.registrationClosesAt === "string" ? data.registrationClosesAt : null,
    startDate: String(data.startDate ?? ""),
    endDate: String(data.endDate ?? ""),
    sites: Array.isArray(data.sites) ? data.sites.map(normalizeSiteConfig) : [],
    pricing: data.pricing as Camp["pricing"],
    ...(typeof data.catalogPricingId === "string" && data.catalogPricingId
      ? { catalogPricingId: data.catalogPricingId }
      : {}),
    createdAt: String(data.createdAt ?? ""),
    updatedAt: String(data.updatedAt ?? ""),
    createdByUid: String(data.createdByUid ?? ""),
    updatedByUid: String(data.updatedByUid ?? ""),
  };
}

function mapSlot(id: string, data: Record<string, unknown>): CampSlot {
  const formulaId = String(data.formulaId ?? "");
  const formulaLabel =
    typeof data.formulaLabel === "string" && data.formulaLabel.trim()
      ? data.formulaLabel.trim()
      : (LEGACY_FORMULA_META[formulaId]?.label ?? formulaId);
  return {
    id,
    campId: String(data.campId ?? ""),
    siteId: String(data.siteId ?? ""),
    siteLabel: String(data.siteLabel ?? ""),
    formulaId,
    formulaLabel,
    date: String(data.date ?? ""),
    startMinutes: Number(data.startMinutes ?? 0),
    endMinutes: Number(data.endMinutes ?? 0),
    label: String(data.label ?? ""),
    capacity: typeof data.capacity === "number" ? data.capacity : null,
    cancelled: data.cancelled === true,
    createdAt: String(data.createdAt ?? ""),
    updatedAt: String(data.updatedAt ?? ""),
  };
}

export async function listCamps(db: Firestore): Promise<CampListItem[]> {
  const snap = await db.collection(CAMP_COLLECTIONS.camps).orderBy("startDate", "desc").get();
  return snap.docs.map((doc) => {
    const c = mapCamp(doc.id, asRecord(doc.data()));
    return {
      id: c.id,
      title: c.title,
      status: c.status,
      startDate: c.startDate,
      endDate: c.endDate,
      seasonLabel: c.seasonLabel,
      updatedAt: c.updatedAt,
    };
  });
}

export async function getCamp(db: Firestore, campId: string): Promise<Camp | null> {
  const doc = await db.collection(CAMP_COLLECTIONS.camps).doc(campId).get();
  if (!doc.exists) return null;
  return mapCamp(doc.id, asRecord(doc.data()));
}

export async function createCamp(
  db: Firestore,
  input: CampCreateInput,
  uid: string
): Promise<Camp> {
  const now = new Date().toISOString();
  const ref = db.collection(CAMP_COLLECTIONS.camps).doc();
  const data = {
    ...input,
    registrationOpensAt: input.registrationOpensAt ?? null,
    registrationClosesAt: input.registrationClosesAt ?? null,
    createdAt: now,
    updatedAt: now,
    createdByUid: uid,
    updatedByUid: uid,
  };
  await ref.set(data);
  return mapCamp(ref.id, data);
}

export async function updateCamp(
  db: Firestore,
  campId: string,
  patch: Record<string, unknown>,
  uid: string
): Promise<Camp | null> {
  const ref = db.collection(CAMP_COLLECTIONS.camps).doc(campId);
  const existing = await ref.get();
  if (!existing.exists) return null;
  const now = new Date().toISOString();
  await ref.update({
    ...patch,
    updatedAt: now,
    updatedByUid: uid,
  });
  const updated = await ref.get();
  return mapCamp(updated.id, asRecord(updated.data()));
}

export type DeleteDraftCampResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "not_draft" | "has_registrations" };

async function deleteDocumentRefs(
  db: Firestore,
  refs: DocumentReference[]
): Promise<void> {
  const chunkSize = 400;
  for (let i = 0; i < refs.length; i += chunkSize) {
    const batch = db.batch();
    for (const ref of refs.slice(i, i + chunkSize)) {
      batch.delete(ref);
    }
    await batch.commit();
  }
}

/**
 * Supprime un stage brouillon (+ créneaux / pointages).
 * Garde-fou : refuse s’il reste des inscriptions actives (données legacy anormales).
 */
export async function deleteDraftCamp(
  db: Firestore,
  campId: string
): Promise<DeleteDraftCampResult> {
  const camp = await getCamp(db, campId);
  if (!camp) return { ok: false, reason: "not_found" };
  if (camp.status !== "draft") return { ok: false, reason: "not_draft" };

  const registrations = await listRegistrationsForCamp(db, campId);
  if (registrations.some((reg) => reg.status !== "cancelled")) {
    return { ok: false, reason: "has_registrations" };
  }

  const slots = await listSlotsForCamp(db, campId);
  const markRefs: DocumentReference[] = [];
  for (const slot of slots) {
    const marks = await listMarksForSlot(db, slot.id);
    for (const mark of marks) {
      markRefs.push(db.collection(CAMP_COLLECTIONS.marks).doc(mark.id));
    }
  }

  const refs: DocumentReference[] = [
    ...markRefs,
    ...slots.map((slot) => db.collection(CAMP_COLLECTIONS.slots).doc(slot.id)),
    ...registrations.map((reg) =>
      db.collection(CAMP_COLLECTIONS.registrations).doc(reg.id)
    ),
    db.collection(CAMP_COLLECTIONS.camps).doc(campId),
  ];
  await deleteDocumentRefs(db, refs);
  return { ok: true };
}

export async function listSlotsForCamp(db: Firestore, campId: string): Promise<CampSlot[]> {
  const snap = await db
    .collection(CAMP_COLLECTIONS.slots)
    .where("campId", "==", campId)
    .get();
  return snap.docs
    .map((doc) => mapSlot(doc.id, asRecord(doc.data())))
    .sort((a, b) =>
      a.date === b.date
        ? a.startMinutes - b.startMinutes
        : a.date.localeCompare(b.date)
    );
}

export async function listSlotsForDate(db: Firestore, dateYmd: string): Promise<CampSlot[]> {
  const snap = await db
    .collection(CAMP_COLLECTIONS.slots)
    .where("date", "==", dateYmd)
    .get();
  return snap.docs
    .map((doc) => mapSlot(doc.id, asRecord(doc.data())))
    .filter((slot) => !slot.cancelled)
    .sort((a, b) => a.startMinutes - b.startMinutes);
}

export async function getSlotsByIds(db: Firestore, slotIds: string[]): Promise<CampSlot[]> {
  if (slotIds.length === 0) return [];
  const unique = [...new Set(slotIds)];
  const refs = unique.map((id) => db.collection(CAMP_COLLECTIONS.slots).doc(id));
  const docs = await db.getAll(...refs);
  return docs.filter((d) => d.exists).map((d) => mapSlot(d.id, asRecord(d.data())));
}

export async function createSlots(
  db: Firestore,
  campId: string,
  slots: Array<{
    siteId: string;
    siteLabel: string;
    formulaId: string;
    formulaLabel: string;
    date: string;
    startMinutes: number;
    endMinutes: number;
    label: string;
    capacity?: number | null | undefined;
  }>
): Promise<CampSlot[]> {
  const now = new Date().toISOString();
  const batch = db.batch();
  const created: CampSlot[] = [];
  for (const slot of slots) {
    const ref = db.collection(CAMP_COLLECTIONS.slots).doc();
    const data = {
      campId,
      siteId: slot.siteId,
      siteLabel: slot.siteLabel,
      formulaId: slot.formulaId,
      formulaLabel: slot.formulaLabel,
      date: slot.date,
      startMinutes: slot.startMinutes,
      endMinutes: slot.endMinutes,
      label: slot.label,
      capacity: slot.capacity ?? null,
      cancelled: false,
      createdAt: now,
      updatedAt: now,
    };
    batch.set(ref, data);
    created.push(mapSlot(ref.id, data));
  }
  await batch.commit();
  return created;
}

export async function patchSlot(
  db: Firestore,
  slotId: string,
  patch: Record<string, unknown>
): Promise<CampSlot | null> {
  const ref = db.collection(CAMP_COLLECTIONS.slots).doc(slotId);
  const existing = await ref.get();
  if (!existing.exists) return null;
  await ref.update({ ...patch, updatedAt: new Date().toISOString() });
  const updated = await ref.get();
  return mapSlot(updated.id, asRecord(updated.data()));
}

export async function createCampRegistration(
  db: Firestore,
  data: Omit<CampRegistration, "id">
): Promise<CampRegistration> {
  const ref = db.collection(CAMP_COLLECTIONS.registrations).doc();
  await ref.set(data);
  return { id: ref.id, ...data };
}

function mapRegistration(
  id: string,
  data: Record<string, unknown>
): CampRegistration {
  const formulaId = String(data.formulaId ?? "");
  const formulaLabel =
    typeof data.formulaLabel === "string" && data.formulaLabel.trim()
      ? data.formulaLabel.trim()
      : (LEGACY_FORMULA_META[formulaId]?.label ?? formulaId);
  return {
    id,
    ...(data as Omit<CampRegistration, "id" | "formulaId" | "formulaLabel">),
    formulaId,
    formulaLabel,
  };
}

export async function getCampRegistration(
  db: Firestore,
  registrationId: string
): Promise<CampRegistration | null> {
  const doc = await db.collection(CAMP_COLLECTIONS.registrations).doc(registrationId).get();
  if (!doc.exists) return null;
  return mapRegistration(doc.id, asRecord(doc.data()));
}

function sortRegistrationsBySubmittedAtDesc(
  regs: CampRegistration[]
): CampRegistration[] {
  return [...regs].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export async function listRegistrationsForOwner(
  db: Firestore,
  ownerUid: string
): Promise<CampRegistration[]> {
  const snap = await db
    .collection(CAMP_COLLECTIONS.registrations)
    .where("ownerUid", "==", ownerUid)
    .get();
  return sortRegistrationsBySubmittedAtDesc(
    snap.docs.map((doc) => mapRegistration(doc.id, asRecord(doc.data())))
  );
}

export async function listRegistrationsForCamp(
  db: Firestore,
  campId: string
): Promise<CampRegistration[]> {
  const snap = await db
    .collection(CAMP_COLLECTIONS.registrations)
    .where("campId", "==", campId)
    .get();
  return sortRegistrationsBySubmittedAtDesc(
    snap.docs.map((doc) => mapRegistration(doc.id, asRecord(doc.data())))
  );
}

export async function listAllCampRegistrations(db: Firestore): Promise<CampRegistration[]> {
  const snap = await db
    .collection(CAMP_COLLECTIONS.registrations)
    .orderBy("submittedAt", "desc")
    .limit(500)
    .get();
  return snap.docs.map((doc) => mapRegistration(doc.id, asRecord(doc.data())));
}

export async function listRegistrationsForClubRegistration(
  db: Firestore,
  clubRegistrationId: string
): Promise<CampRegistration[]> {
  const snap = await db
    .collection(CAMP_COLLECTIONS.registrations)
    .where("clubRegistrationId", "==", clubRegistrationId)
    .get();
  return sortRegistrationsBySubmittedAtDesc(
    snap.docs.map((doc) => mapRegistration(doc.id, asRecord(doc.data())))
  );
}

export async function listRegistrationsForSlot(
  db: Firestore,
  slotId: string
): Promise<CampRegistration[]> {
  const snap = await db
    .collection(CAMP_COLLECTIONS.registrations)
    .where("slotIds", "array-contains", slotId)
    .get();
  return snap.docs
    .map((doc) => mapRegistration(doc.id, asRecord(doc.data())))
    .filter((r) => r.status !== "cancelled");
}

export async function updateCampRegistration(
  db: Firestore,
  registrationId: string,
  patch: Record<string, unknown>
): Promise<void> {
  await db
    .collection(CAMP_COLLECTIONS.registrations)
    .doc(registrationId)
    .update({ ...patch, updatedAt: new Date().toISOString() });
}

export async function listMarksForSlot(
  db: Firestore,
  slotId: string
): Promise<CampAttendanceMark[]> {
  const snap = await db
    .collection(CAMP_COLLECTIONS.marks)
    .where("slotId", "==", slotId)
    .get();
  return snap.docs.map((doc) =>
    normalizeCampAttendanceMark(doc.id, asRecord(doc.data()))
  );
}

export async function upsertCampMark(
  db: Firestore,
  mark: CampAttendanceMark
): Promise<CampAttendanceMark> {
  const { id, ...payload } = mark;
  const ref = db.collection(CAMP_COLLECTIONS.marks).doc(id);
  await ref.set({ ...payload }, { merge: true });
  return mark;
}

export async function deleteCampMarkById(
  db: Firestore,
  markId: string
): Promise<boolean> {
  const ref = db.collection(CAMP_COLLECTIONS.marks).doc(markId);
  const snap = await ref.get();
  if (!snap.exists) {
    return false;
  }
  await ref.delete();
  return true;
}

export async function deleteCampMark(
  db: Firestore,
  slotId: string,
  campRegistrationId: string
): Promise<void> {
  await deleteCampMarkById(db, `${slotId}__${campRegistrationId}`);
}

/** Placeholder for FieldValue usage in payment array unions. */
export { FieldValue };
