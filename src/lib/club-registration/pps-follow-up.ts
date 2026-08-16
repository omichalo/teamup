import { isMinorForClubSeason } from "@/lib/club-registration/season-age";

/**
 * Suivi local historisé du PPS (Parcours Prévention Santé FFTT).
 * L’app n’a pas accès à l’espace licencié : saisie manuelle secrétariat / adjoint.
 */

export const PPS_FOLLOW_UP_STATUS_VALUES = [
  "not_applicable",
  "expected",
  "checked_incomplete",
  "ok",
] as const;

export type PpsFollowUpStatus = (typeof PPS_FOLLOW_UP_STATUS_VALUES)[number];

export const PPS_FOLLOW_UP_STATUS_LABELS: Record<PpsFollowUpStatus, string> = {
  not_applicable: "Non applicable",
  expected: "PPS attendu",
  checked_incomplete: "PPS non fait",
  ok: "PPS OK",
};

export const PPS_FOLLOW_UP_EVENT_TYPES = [
  "control_incomplete",
  "reminder",
  "marked_ok",
  "reopened",
] as const;

export type PpsFollowUpEventType = (typeof PPS_FOLLOW_UP_EVENT_TYPES)[number];

export const PPS_FOLLOW_UP_EVENT_LABELS: Record<PpsFollowUpEventType, string> = {
  control_incomplete: "Contrôle — PPS non fait",
  reminder: "Relance",
  marked_ok: "PPS OK",
  reopened: "Réouverture (correction)",
};

export const PPS_FOLLOW_UP_NOTE_MAX_LENGTH = 500;
export const PPS_FOLLOW_UP_EVENTS_MAX = 50;

/** Déclarations pour lesquelles un suivi PPS local est pertinent. */
const PPS_FOLLOW_UP_DECLARATIONS: ReadonlySet<string> = new Set([
  "adult_pps_declared",
  "under_40_all_no",
  "over_40_cert_unchanged_all_no",
]);

export type PpsFollowUpEvent = {
  id: string;
  type: PpsFollowUpEventType;
  note: string | null;
  at: string;
  byUid: string;
};

export type PpsFollowUpState = {
  status: PpsFollowUpStatus;
  updatedAt: string | null;
  updatedBy: string | null;
  events: PpsFollowUpEvent[];
};

export function isPpsFollowUpStatus(
  value: unknown
): value is PpsFollowUpStatus {
  return PPS_FOLLOW_UP_STATUS_VALUES.includes(value as PpsFollowUpStatus);
}

export function isPpsFollowUpEventType(
  value: unknown
): value is PpsFollowUpEventType {
  return PPS_FOLLOW_UP_EVENT_TYPES.includes(value as PpsFollowUpEventType);
}

export function isPpsFollowUpApplicable(
  declaration: string | null | undefined,
  birthDate?: string | null,
  seasonLabel?: string
): boolean {
  if (birthDate && isMinorForClubSeason(birthDate, seasonLabel)) {
    return false;
  }
  return Boolean(declaration && PPS_FOLLOW_UP_DECLARATIONS.has(declaration));
}

export function initialPpsFollowUpStatus(
  declaration: string | null | undefined,
  birthDate?: string | null,
  seasonLabel?: string
): PpsFollowUpStatus {
  return isPpsFollowUpApplicable(declaration, birthDate, seasonLabel)
    ? "expected"
    : "not_applicable";
}

export function normalizePpsFollowUpStatus(
  status: unknown,
  declaration: string | null | undefined,
  birthDate?: string | null,
  seasonLabel?: string
): PpsFollowUpStatus {
  if (!isPpsFollowUpApplicable(declaration, birthDate, seasonLabel)) {
    return "not_applicable";
  }
  if (isPpsFollowUpStatus(status) && status !== "not_applicable") {
    return status;
  }
  return "expected";
}

export function nextPpsFollowUpStatus(
  current: PpsFollowUpStatus,
  eventType: PpsFollowUpEventType
): PpsFollowUpStatus | null {
  if (current === "not_applicable") {
    return null;
  }
  switch (eventType) {
    case "control_incomplete":
      return "checked_incomplete";
    case "reminder":
      return current;
    case "marked_ok":
      return "ok";
    case "reopened":
      return current === "ok" ? "expected" : null;
    default:
      return null;
  }
}

export function canApplyPpsFollowUpEvent(
  current: PpsFollowUpStatus,
  eventType: PpsFollowUpEventType
): boolean {
  return nextPpsFollowUpStatus(current, eventType) !== null;
}

export function normalizePpsFollowUpNote(
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
  if (trimmed.length > PPS_FOLLOW_UP_NOTE_MAX_LENGTH) {
    return {
      error: `Note trop longue (max ${PPS_FOLLOW_UP_NOTE_MAX_LENGTH} caractères)`,
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

export function parsePpsFollowUpEvents(raw: unknown): PpsFollowUpEvent[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const events: PpsFollowUpEvent[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const record = item as Record<string, unknown>;
    if (typeof record.id !== "string" || record.id.length === 0) {
      continue;
    }
    if (!isPpsFollowUpEventType(record.type)) {
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

export function readPpsFollowUpState(
  data: Record<string, unknown>,
  declaration: string | null | undefined
): PpsFollowUpState {
  const birthDate =
    typeof data.birthDate === "string" && data.birthDate.length > 0
      ? data.birthDate
      : undefined;
  const status = normalizePpsFollowUpStatus(
    data.ppsFollowUpStatus,
    declaration,
    birthDate
  );
  const updatedAt = readEventAt(data.ppsFollowUpUpdatedAt);
  const updatedBy =
    typeof data.ppsFollowUpUpdatedBy === "string" &&
    data.ppsFollowUpUpdatedBy.length > 0
      ? data.ppsFollowUpUpdatedBy
      : null;
  return {
    status,
    updatedAt,
    updatedBy,
    events: parsePpsFollowUpEvents(data.ppsFollowUpEvents),
  };
}

export type ManagedListPpsFollowUpFilter = "all" | PpsFollowUpStatus;

export const MANAGED_LIST_PPS_FOLLOW_UP_FILTER_OPTIONS: {
  value: ManagedListPpsFollowUpFilter;
  label: string;
  hint?: string;
}[] = [
  { value: "all", label: "Tous" },
  {
    value: "expected",
    label: "Attendu",
    hint: "PPS déclaré, pas encore contrôlé OK.",
  },
  {
    value: "checked_incomplete",
    label: "Non fait",
    hint: "Contrôle effectué : PPS pas encore complété côté FFTT.",
  },
  {
    value: "ok",
    label: "OK",
    hint: "PPS vérifié OK sur l’espace licencié FFTT.",
  },
];

export function resolveManagedListPpsFollowUpFilter(
  value: string | null | undefined
): ManagedListPpsFollowUpFilter {
  if (!value || value === "all") {
    return "all";
  }
  if (isPpsFollowUpStatus(value) && value !== "not_applicable") {
    return value;
  }
  return "all";
}

export function matchesPpsFollowUpFilter(
  status: PpsFollowUpStatus,
  filter: ManagedListPpsFollowUpFilter
): boolean {
  if (filter === "all") {
    return true;
  }
  return status === filter;
}
