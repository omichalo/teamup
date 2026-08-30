import type { DocumentData, Firestore, Query } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { COLLECTION as REGISTRATIONS_COLLECTION } from "@/lib/club-registration/list-registrations";
import { isRejectedRegistration } from "./alerts";
import {
  ATTENDANCE_LEADS_COLLECTION,
  ATTENDANCE_MARKS_COLLECTION,
  ATTENDANCE_SLOT_CANCELLATIONS_COLLECTION,
  LEADS_PAGE_SIZE_DEFAULT,
  type AttendanceLeadStatus,
  type AttendanceMarkKind,
} from "./constants";
import { attendanceSessionId, buildAttendanceMarkId } from "./mark-id";
import type { AttendanceLead, AttendanceMark, AttendanceSlotCancellation } from "./types";

function readString(data: DocumentData, key: string): string {
  const value = data[key];
  return typeof value === "string" ? value : "";
}

export function mapMarkDoc(id: string, data: DocumentData): AttendanceMark {
  const kind = data.kind as AttendanceMarkKind;
  return {
    id,
    date: readString(data, "date"),
    slotId: readString(data, "slotId"),
    siteId: readString(data, "siteId"),
    seasonLabel: readString(data, "seasonLabel"),
    sessionId: readString(data, "sessionId"),
    kind,
    registrationId: data.registrationId ? String(data.registrationId) : undefined,
    leadId: data.leadId ? String(data.leadId) : undefined,
    displayName: readString(data, "displayName"),
    markedAt: readString(data, "markedAt"),
    markedByUid: readString(data, "markedByUid"),
    addSlotRequested: data.addSlotRequested === true ? true : undefined,
  };
}

export function mapLeadDoc(id: string, data: DocumentData): AttendanceLead {
  const email = readString(data, "email");
  return {
    id,
    firstName: readString(data, "firstName"),
    lastName: readString(data, "lastName"),
    phone: readString(data, "phone"),
    ...(email ? { email } : {}),
    sourceDate: readString(data, "sourceDate"),
    sourceSlotId: readString(data, "sourceSlotId"),
    sourceSiteId: readString(data, "sourceSiteId"),
    createdAt: readString(data, "createdAt"),
    createdByUid: readString(data, "createdByUid"),
    status: data.status as AttendanceLeadStatus,
  };
}

export function mapCancellationDoc(id: string, data: DocumentData): AttendanceSlotCancellation {
  return {
    id,
    date: readString(data, "date"),
    slotId: readString(data, "slotId"),
    siteId: readString(data, "siteId"),
    seasonLabel: readString(data, "seasonLabel"),
    cancelledAt: readString(data, "cancelledAt"),
    cancelledByUid: readString(data, "cancelledByUid"),
  };
}

export async function listRegistrationsForSlot(
  db: Firestore,
  slotId: string
): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  const snap = await db
    .collection(REGISTRATIONS_COLLECTION)
    .where("slotIds", "array-contains", slotId)
    .get();
  return snap.docs
    .map((doc) => ({ id: doc.id, data: doc.data() as Record<string, unknown> }))
    .filter((item) => !isRejectedRegistration(item.data));
}

export async function getRegistrationData(
  db: Firestore,
  registrationId: string
): Promise<Record<string, unknown> | null> {
  const snap = await db.collection(REGISTRATIONS_COLLECTION).doc(registrationId).get();
  if (!snap.exists) {
    return null;
  }
  return snap.data() as Record<string, unknown>;
}

export async function listMarksForSession(
  db: Firestore,
  date: string,
  slotId: string
): Promise<AttendanceMark[]> {
  const snap = await db
    .collection(ATTENDANCE_MARKS_COLLECTION)
    .where("slotId", "==", slotId)
    .where("date", "==", date)
    .get();
  return snap.docs.map((doc) => mapMarkDoc(doc.id, doc.data()));
}

export async function listMarksForSlotSeason(
  db: Firestore,
  seasonLabel: string,
  slotId: string
): Promise<AttendanceMark[]> {
  const snap = await db
    .collection(ATTENDANCE_MARKS_COLLECTION)
    .where("seasonLabel", "==", seasonLabel)
    .where("slotId", "==", slotId)
    .orderBy("date", "asc")
    .get();
  return snap.docs.map((doc) => mapMarkDoc(doc.id, doc.data()));
}

export async function upsertAttendanceMark(
  db: Firestore,
  params: {
    date: string;
    slotId: string;
    siteId: string;
    seasonLabel: string;
    kind: AttendanceMarkKind;
    registrationId?: string | undefined;
    leadId?: string | undefined;
    displayName: string;
    markedByUid: string;
    addSlotRequested?: boolean | undefined;
  }
): Promise<AttendanceMark> {
  const id = buildAttendanceMarkId(params);
  if (!id) {
    throw new Error("Identifiant de présence invalide");
  }
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    date: params.date,
    slotId: params.slotId,
    siteId: params.siteId,
    seasonLabel: params.seasonLabel,
    sessionId: attendanceSessionId(params.date, params.slotId),
    kind: params.kind,
    displayName: params.displayName,
    markedAt: now,
    markedByUid: params.markedByUid,
  };
  if (params.registrationId) payload.registrationId = params.registrationId;
  if (params.leadId) payload.leadId = params.leadId;
  if (params.addSlotRequested) payload.addSlotRequested = true;

  await db.collection(ATTENDANCE_MARKS_COLLECTION).doc(id).set(payload);
  return mapMarkDoc(id, payload);
}

export async function deleteAttendanceMark(
  db: Firestore,
  markId: string
): Promise<boolean> {
  const ref = db.collection(ATTENDANCE_MARKS_COLLECTION).doc(markId);
  const snap = await ref.get();
  if (!snap.exists) {
    return false;
  }
  await ref.delete();
  return true;
}

export async function createLeadWithGuestMark(
  db: Firestore,
  params: {
    date: string;
    slotId: string;
    siteId: string;
    seasonLabel: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string | undefined;
    createdByUid: string;
  }
): Promise<{ lead: AttendanceLead; mark: AttendanceMark }> {
  const leadRef = db.collection(ATTENDANCE_LEADS_COLLECTION).doc();
  const now = new Date().toISOString();
  const displayName = `${params.firstName} ${params.lastName}`.trim();
  const leadPayload: Record<string, unknown> = {
    firstName: params.firstName,
    lastName: params.lastName,
    phone: params.phone,
    sourceDate: params.date,
    sourceSlotId: params.slotId,
    sourceSiteId: params.siteId,
    createdAt: now,
    createdByUid: params.createdByUid,
    status: "open",
  };
  if (params.email) {
    leadPayload.email = params.email;
  }

  const markId = buildAttendanceMarkId({
    date: params.date,
    slotId: params.slotId,
    kind: "guest",
    leadId: leadRef.id,
  });
  if (!markId) {
    throw new Error("Identifiant de présence invalide");
  }

  const markPayload: Record<string, unknown> = {
    date: params.date,
    slotId: params.slotId,
    siteId: params.siteId,
    seasonLabel: params.seasonLabel,
    sessionId: attendanceSessionId(params.date, params.slotId),
    kind: "guest",
    leadId: leadRef.id,
    displayName,
    markedAt: now,
    markedByUid: params.createdByUid,
  };

  const batch = db.batch();
  batch.set(leadRef, leadPayload);
  batch.set(db.collection(ATTENDANCE_MARKS_COLLECTION).doc(markId), markPayload);
  await batch.commit();

  return {
    lead: mapLeadDoc(leadRef.id, leadPayload),
    mark: mapMarkDoc(markId, markPayload),
  };
}

export async function listLeads(
  db: Firestore,
  status?: AttendanceLeadStatus
): Promise<AttendanceLead[]> {
  let query: Query = db.collection(ATTENDANCE_LEADS_COLLECTION);
  if (status) {
    query = query.where("status", "==", status);
  }
  const snap = await query.orderBy("createdAt", "desc").limit(LEADS_PAGE_SIZE_DEFAULT).get();
  return snap.docs.map((doc) => mapLeadDoc(doc.id, doc.data()));
}

export async function patchLeadStatus(
  db: Firestore,
  leadId: string,
  status: AttendanceLeadStatus
): Promise<AttendanceLead | null> {
  const ref = db.collection(ATTENDANCE_LEADS_COLLECTION).doc(leadId);
  const snap = await ref.get();
  if (!snap.exists) {
    return null;
  }
  await ref.update({ status });
  const updated = await ref.get();
  return mapLeadDoc(leadId, updated.data() ?? {});
}

export async function addSlotToRegistration(
  db: Firestore,
  params: {
    date: string;
    slotId: string;
    siteId: string;
    seasonLabel: string;
    registrationId: string;
    displayName: string;
    markedByUid: string;
  }
): Promise<{ slotAdded: boolean }> {
  const regRef = db.collection(REGISTRATIONS_COLLECTION).doc(params.registrationId);
  const markId = buildAttendanceMarkId({
    date: params.date,
    slotId: params.slotId,
    kind: "enrolled",
    registrationId: params.registrationId,
  });
  if (!markId) {
    throw new Error("Identifiant de présence invalide");
  }
  const markRef = db.collection(ATTENDANCE_MARKS_COLLECTION).doc(markId);

  await db.runTransaction(async (tx) => {
    const registration = await tx.get(regRef);
    if (!registration.exists) {
      throw new Error("Dossier introuvable");
    }
    const data = registration.data() ?? {};
    if (data.status === "rejected") {
      throw new Error("Dossier refusé");
    }
    tx.update(regRef, { slotIds: FieldValue.arrayUnion(params.slotId) });
    const now = new Date().toISOString();
    tx.set(markRef, {
      date: params.date,
      slotId: params.slotId,
      siteId: params.siteId,
      seasonLabel: params.seasonLabel,
      sessionId: attendanceSessionId(params.date, params.slotId),
      kind: "enrolled",
      registrationId: params.registrationId,
      displayName: params.displayName,
      markedAt: now,
      markedByUid: params.markedByUid,
      addSlotRequested: true,
    });
  });

  return { slotAdded: true };
}

export async function getSlotCancellation(
  db: Firestore,
  date: string,
  slotId: string
): Promise<AttendanceSlotCancellation | null> {
  const id = attendanceSessionId(date, slotId);
  const snap = await db.collection(ATTENDANCE_SLOT_CANCELLATIONS_COLLECTION).doc(id).get();
  if (!snap.exists) {
    return null;
  }
  return mapCancellationDoc(id, snap.data() ?? {});
}

export async function listCancellationsForDate(
  db: Firestore,
  date: string
): Promise<AttendanceSlotCancellation[]> {
  const snap = await db
    .collection(ATTENDANCE_SLOT_CANCELLATIONS_COLLECTION)
    .where("date", "==", date)
    .get();
  return snap.docs.map((doc) => mapCancellationDoc(doc.id, doc.data()));
}

export async function listCancellationsForDates(
  db: Firestore,
  dates: readonly string[]
): Promise<AttendanceSlotCancellation[]> {
  if (dates.length === 0) {
    return [];
  }
  const unique = [...new Set(dates)];
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 10) {
    chunks.push(unique.slice(i, i + 10));
  }
  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const snap = await db
        .collection(ATTENDANCE_SLOT_CANCELLATIONS_COLLECTION)
        .where("date", "in", chunk)
        .get();
      return snap.docs.map((doc) => mapCancellationDoc(doc.id, doc.data()));
    })
  );
  return results.flat();
}

export async function listCancellationsForSlot(
  db: Firestore,
  slotId: string,
  fromDate: string,
  toDate: string
): Promise<AttendanceSlotCancellation[]> {
  const snap = await db
    .collection(ATTENDANCE_SLOT_CANCELLATIONS_COLLECTION)
    .where("slotId", "==", slotId)
    .where("date", ">=", fromDate)
    .where("date", "<=", toDate)
    .get();
  return snap.docs.map((doc) => mapCancellationDoc(doc.id, doc.data()));
}

export async function upsertSlotCancellations(
  db: Firestore,
  items: Array<{
    date: string;
    slotId: string;
    siteId: string;
    seasonLabel: string;
    cancelledByUid: string;
  }>
): Promise<{ written: number; ids: string[] }> {
  if (items.length === 0) {
    return { written: 0, ids: [] };
  }
  const now = new Date().toISOString();
  const ids: string[] = [];
  let batch = db.batch();
  let ops = 0;
  for (const item of items) {
    const id = attendanceSessionId(item.date, item.slotId);
    ids.push(id);
    const ref = db.collection(ATTENDANCE_SLOT_CANCELLATIONS_COLLECTION).doc(id);
    batch.set(ref, {
      date: item.date,
      slotId: item.slotId,
      siteId: item.siteId,
      seasonLabel: item.seasonLabel,
      cancelledAt: now,
      cancelledByUid: item.cancelledByUid,
    });
    ops += 1;
    if (ops >= 400) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops > 0) {
    await batch.commit();
  }
  return { written: ids.length, ids };
}

export async function deleteSlotCancellations(
  db: Firestore,
  targets: Array<{ date: string; slotId: string }>
): Promise<{ deleted: number; ids: string[] }> {
  if (targets.length === 0) {
    return { deleted: 0, ids: [] };
  }
  const ids = targets.map((item) => attendanceSessionId(item.date, item.slotId));
  const refs = ids.map((id) => db.collection(ATTENDANCE_SLOT_CANCELLATIONS_COLLECTION).doc(id));
  const snaps = await db.getAll(...refs);
  const existing = snaps.filter((snap) => snap.exists);
  let batch = db.batch();
  let ops = 0;
  const deletedIds: string[] = [];
  for (const snap of existing) {
    batch.delete(snap.ref);
    deletedIds.push(snap.id);
    ops += 1;
    if (ops >= 400) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops > 0) {
    await batch.commit();
  }
  return { deleted: deletedIds.length, ids: deletedIds };
}
