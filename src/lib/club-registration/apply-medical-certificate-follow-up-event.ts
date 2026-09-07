import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { randomUUID } from "crypto";
import {
  canApplyMedicalCertificateFollowUpEvent,
  isMedicalCertificateFollowUpApplicable,
  medicalCertificateStatusForFollowUpEvent,
  MEDICAL_CERTIFICATE_FOLLOW_UP_EVENTS_MAX,
  normalizeMedicalCertificateFollowUpNote,
  readMedicalCertificateFollowUpState,
  type MedicalCertificateFollowUpEvent,
  type MedicalCertificateFollowUpEventType,
  type MedicalCertificateFollowUpState,
} from "@/lib/club-registration/medical-certificate-follow-up";

const COLLECTION = "clubRegistrations";

export type ApplyMedicalCertificateFollowUpEventResult =
  | { ok: true; state: MedicalCertificateFollowUpState }
  | { ok: false; status: 400 | 404; error: string };

export async function applyMedicalCertificateFollowUpEvent(
  db: Firestore,
  registrationId: string,
  actorUid: string,
  input: { type: MedicalCertificateFollowUpEventType; note?: unknown }
): Promise<ApplyMedicalCertificateFollowUpEventResult> {
  const noteResult = normalizeMedicalCertificateFollowUpNote(input.note);
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

  if (!isMedicalCertificateFollowUpApplicable(declaration)) {
    return {
      ok: false,
      status: 400,
      error: "Ce dossier n’est pas soumis au suivi certificat médical",
    };
  }

  const current = readMedicalCertificateFollowUpState(data, declaration);
  if (
    !canApplyMedicalCertificateFollowUpEvent(
      current.medicalCertificateStatus,
      declaration,
      input.type
    )
  ) {
    return {
      ok: false,
      status: 400,
      error: "Action certificat impossible pour l’état actuel",
    };
  }

  const atIso = new Date().toISOString();
  const event: MedicalCertificateFollowUpEvent = {
    id: randomUUID(),
    type: input.type,
    note,
    at: atIso,
    byUid: actorUid,
  };

  const events = [event, ...current.events].slice(
    0,
    MEDICAL_CERTIFICATE_FOLLOW_UP_EVENTS_MAX
  );

  const nextCertificateStatus =
    medicalCertificateStatusForFollowUpEvent(input.type) ??
    current.medicalCertificateStatus;

  const patch: Record<string, unknown> = {
    medicalCertificateFollowUpEvents: events,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (nextCertificateStatus !== current.medicalCertificateStatus) {
    patch.medicalCertificateStatus = nextCertificateStatus;
    patch.medicalCertificateStatusUpdatedBy = actorUid;
    patch.medicalCertificateStatusUpdatedAt = FieldValue.serverTimestamp();
  }

  await docRef.set(patch, { merge: true });

  return {
    ok: true,
    state: {
      medicalCertificateStatus: nextCertificateStatus,
      events,
    },
  };
}
