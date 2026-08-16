import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { randomUUID } from "crypto";
import {
  canApplyPpsFollowUpEvent,
  isPpsFollowUpApplicable,
  nextPpsFollowUpStatus,
  normalizePpsFollowUpNote,
  PPS_FOLLOW_UP_EVENTS_MAX,
  readPpsFollowUpState,
  type PpsFollowUpEvent,
  type PpsFollowUpEventType,
  type PpsFollowUpState,
} from "@/lib/club-registration/pps-follow-up";

const COLLECTION = "clubRegistrations";

export type ApplyPpsFollowUpEventResult =
  | { ok: true; state: PpsFollowUpState }
  | { ok: false; status: 400 | 404; error: string };

export async function applyPpsFollowUpEvent(
  db: Firestore,
  registrationId: string,
  actorUid: string,
  input: { type: PpsFollowUpEventType; note?: unknown }
): Promise<ApplyPpsFollowUpEventResult> {
  const noteResult = normalizePpsFollowUpNote(input.note);
  if (noteResult && typeof noteResult === "object" && "error" in noteResult) {
    return { ok: false, status: 400, error: noteResult.error };
  }
  const note = noteResult as string | null;

  const docRef = db.collection(COLLECTION).doc(registrationId);
  const snap = await docRef.get();
  if (!snap.exists) {
    return { ok: false, status: 404, error: "Dossier introuvable" };
  }

  const data = (snap.data() ?? {}) as Record<string, unknown>;
  const declaration =
    typeof data.medicalCertificateDeclaration === "string"
      ? data.medicalCertificateDeclaration
      : null;
  const birthDate = typeof data.birthDate === "string" ? data.birthDate : null;

  if (!isPpsFollowUpApplicable(declaration, birthDate)) {
    return {
      ok: false,
      status: 400,
      error: "Ce dossier n’est pas soumis au suivi PPS",
    };
  }

  const current = readPpsFollowUpState(data, declaration);
  if (!canApplyPpsFollowUpEvent(current.status, input.type)) {
    return {
      ok: false,
      status: 400,
      error: "Action PPS impossible pour l’état actuel",
    };
  }

  const nextStatus = nextPpsFollowUpStatus(current.status, input.type);
  if (!nextStatus) {
    return {
      ok: false,
      status: 400,
      error: "Action PPS impossible pour l’état actuel",
    };
  }

  const atIso = new Date().toISOString();
  const event: PpsFollowUpEvent = {
    id: randomUUID(),
    type: input.type,
    note,
    at: atIso,
    byUid: actorUid,
  };

  const events = [event, ...current.events].slice(0, PPS_FOLLOW_UP_EVENTS_MAX);

  await docRef.set(
    {
      ppsFollowUpStatus: nextStatus,
      ppsFollowUpUpdatedAt: FieldValue.serverTimestamp(),
      ppsFollowUpUpdatedBy: actorUid,
      ppsFollowUpEvents: events,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return {
    ok: true,
    state: {
      status: nextStatus,
      updatedAt: atIso,
      updatedBy: actorUid,
      events,
    },
  };
}
