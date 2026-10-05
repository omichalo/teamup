import type { DocumentData, Firestore } from "firebase-admin/firestore";
import { ATTENDANCE_SESSION_NOTES_COLLECTION } from "./constants";
import type { CancellationTarget } from "./cancellations";
import { attendanceSessionId } from "./mark-id";
import type { AttendanceSessionNote } from "./types";

function readString(data: DocumentData, key: string): string {
  const value = data[key];
  return typeof value === "string" ? value : "";
}

export function mapSessionNoteDoc(id: string, data: DocumentData): AttendanceSessionNote {
  return {
    id,
    date: readString(data, "date"),
    slotId: readString(data, "slotId"),
    siteId: readString(data, "siteId"),
    seasonLabel: readString(data, "seasonLabel"),
    body: readString(data, "body"),
    updatedAt: readString(data, "updatedAt"),
    updatedByUid: readString(data, "updatedByUid"),
  };
}

export async function getSessionNote(
  db: Firestore,
  date: string,
  slotId: string
): Promise<AttendanceSessionNote | null> {
  const id = attendanceSessionId(date, slotId);
  const snap = await db.collection(ATTENDANCE_SESSION_NOTES_COLLECTION).doc(id).get();
  if (!snap.exists) {
    return null;
  }
  return mapSessionNoteDoc(snap.id, snap.data() ?? {});
}

export async function upsertSessionNotes(
  db: Firestore,
  targets: CancellationTarget[],
  params: {
    body: string;
    seasonLabel: string;
    updatedByUid: string;
  }
): Promise<{ written: number; ids: string[] }> {
  if (targets.length === 0) {
    return { written: 0, ids: [] };
  }
  const now = new Date().toISOString();
  const ids: string[] = [];
  let batch = db.batch();
  let ops = 0;
  for (const target of targets) {
    const id = attendanceSessionId(target.date, target.slotId);
    ids.push(id);
    const ref = db.collection(ATTENDANCE_SESSION_NOTES_COLLECTION).doc(id);
    batch.set(ref, {
      date: target.date,
      slotId: target.slotId,
      siteId: target.siteId,
      seasonLabel: params.seasonLabel,
      body: params.body,
      updatedAt: now,
      updatedByUid: params.updatedByUid,
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

export async function deleteSessionNotes(
  db: Firestore,
  targets: CancellationTarget[]
): Promise<{ deleted: number; ids: string[] }> {
  if (targets.length === 0) {
    return { deleted: 0, ids: [] };
  }
  const ids = targets.map((item) => attendanceSessionId(item.date, item.slotId));
  const refs = ids.map((id) => db.collection(ATTENDANCE_SESSION_NOTES_COLLECTION).doc(id));
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

/** Tronque le corps pour les logs d'audit (pas de texte long en clair). */
export function truncateCoachMessageForAudit(body: string, max = 80): string {
  const trimmed = body.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max)}…`;
}
