import {
  isMedicalCertificateRequired,
  MEDICAL_CERTIFICATE_STATUS_LABELS,
  normalizeMedicalCertificateStatus,
  type MedicalCertificateStatus,
} from "@/lib/club-registration/medical-certificate";

/**
 * Historique de relances certificat médical (page licence).
 * Le statut métier reste `medicalCertificateStatus` (source unique).
 */

export const MEDICAL_CERTIFICATE_FOLLOW_UP_EVENT_TYPES = [
  "reminder",
  "marked_ok",
  "reopened",
] as const;

export type MedicalCertificateFollowUpEventType =
  (typeof MEDICAL_CERTIFICATE_FOLLOW_UP_EVENT_TYPES)[number];

export const MEDICAL_CERTIFICATE_FOLLOW_UP_EVENT_LABELS: Record<
  MedicalCertificateFollowUpEventType,
  string
> = {
  reminder: "Relance",
  marked_ok: "Validé",
  reopened: "Réouverture (correction)",
};

export const MEDICAL_CERTIFICATE_FOLLOW_UP_NOTE_MAX_LENGTH = 500;
export const MEDICAL_CERTIFICATE_FOLLOW_UP_EVENTS_MAX = 50;

export type MedicalCertificateFollowUpEvent = {
  id: string;
  type: MedicalCertificateFollowUpEventType;
  note: string | null;
  at: string;
  byUid: string;
};

/** Vue UI : statut dossier + historique des relances. */
export type MedicalCertificateFollowUpState = {
  medicalCertificateStatus: MedicalCertificateStatus;
  events: MedicalCertificateFollowUpEvent[];
};

export function isMedicalCertificateFollowUpEventType(
  value: unknown
): value is MedicalCertificateFollowUpEventType {
  return MEDICAL_CERTIFICATE_FOLLOW_UP_EVENT_TYPES.includes(
    value as MedicalCertificateFollowUpEventType
  );
}

export function isMedicalCertificateFollowUpApplicable(
  declaration: string | null | undefined
): boolean {
  return isMedicalCertificateRequired(declaration);
}

export function medicalCertificateFollowUpChipLabel(
  status: MedicalCertificateStatus
): string {
  return MEDICAL_CERTIFICATE_STATUS_LABELS[status];
}

/** Statut dossier produit par l’événement (null = inchangé). */
export function medicalCertificateStatusForFollowUpEvent(
  eventType: MedicalCertificateFollowUpEventType
): "validated" | "required_not_received" | null {
  switch (eventType) {
    case "marked_ok":
      return "validated";
    case "reopened":
      return "required_not_received";
    default:
      return null;
  }
}

export function canApplyMedicalCertificateFollowUpEvent(
  medicalCertificateStatus: MedicalCertificateStatus,
  declaration: string | null | undefined,
  eventType: MedicalCertificateFollowUpEventType
): boolean {
  if (!isMedicalCertificateFollowUpApplicable(declaration)) {
    return false;
  }
  switch (eventType) {
    case "reminder":
      return true;
    case "marked_ok":
      return medicalCertificateStatus !== "validated";
    case "reopened":
      return medicalCertificateStatus === "validated";
    default:
      return false;
  }
}

export function normalizeMedicalCertificateFollowUpNote(
  note: unknown
): string | null | { error: string } {
  if (note === undefined || note === null || note === "") {
    return null;
  }
  if (typeof note !== "string") {
    return { error: "Note invalide" };
  }
  const trimmed = note.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length > MEDICAL_CERTIFICATE_FOLLOW_UP_NOTE_MAX_LENGTH) {
    return {
      error: `Note trop longue (max ${MEDICAL_CERTIFICATE_FOLLOW_UP_NOTE_MAX_LENGTH} caractères)`,
    };
  }
  return trimmed;
}

function readEventAt(raw: unknown): string | null {
  if (typeof raw === "string" && raw.length > 0) {
    return raw;
  }
  if (
    raw &&
    typeof raw === "object" &&
    "toDate" in raw &&
    typeof (raw as { toDate?: unknown }).toDate === "function"
  ) {
    try {
      return (raw as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return null;
    }
  }
  return null;
}

export function parseMedicalCertificateFollowUpEvents(
  raw: unknown
): MedicalCertificateFollowUpEvent[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const events: MedicalCertificateFollowUpEvent[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const record = item as Record<string, unknown>;
    if (typeof record.id !== "string" || record.id.length === 0) {
      continue;
    }
    if (!isMedicalCertificateFollowUpEventType(record.type)) {
      continue;
    }
    const at = readEventAt(record.at);
    if (!at) {
      continue;
    }
    if (typeof record.byUid !== "string" || record.byUid.length === 0) {
      continue;
    }
    const note =
      typeof record.note === "string" && record.note.trim().length > 0
        ? record.note.trim()
        : null;
    events.push({
      id: record.id,
      type: record.type,
      note,
      at,
      byUid: record.byUid,
    });
  }
  return events;
}

export function readMedicalCertificateFollowUpState(
  data: Record<string, unknown>,
  declaration: string | null | undefined
): MedicalCertificateFollowUpState {
  return {
    medicalCertificateStatus: normalizeMedicalCertificateStatus(
      data.medicalCertificateStatus,
      declaration
    ),
    events: parseMedicalCertificateFollowUpEvents(
      data.medicalCertificateFollowUpEvents
    ),
  };
}
