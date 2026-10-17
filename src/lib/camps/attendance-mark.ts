import type { CampAttendanceMarkKind } from "./constants";
import { CAMP_ATTENDANCE_MARK_KINDS } from "./constants";
import type { CampAttendanceMark } from "./types";

export function isCampAttendanceMarkKind(
  value: string | null | undefined
): value is CampAttendanceMarkKind {
  return (
    typeof value === "string" &&
    (CAMP_ATTENDANCE_MARK_KINDS as readonly string[]).includes(value)
  );
}

/** Ids stables ; enrolled legacy = `{slotId}__{campRegistrationId}`. */
export function buildCampAttendanceMarkId(params: {
  slotId: string;
  kind: CampAttendanceMarkKind;
  campRegistrationId?: string | null;
  clubRegistrationId?: string | null;
  externalId?: string | null;
}): string | null {
  const { slotId, kind } = params;
  if (kind === "enrolled") {
    const id = params.campRegistrationId?.trim();
    return id ? `${slotId}__${id}` : null;
  }
  if (kind === "member_walkin") {
    const id = params.clubRegistrationId?.trim();
    return id ? `${slotId}__club_${id}` : null;
  }
  const externalId = params.externalId?.trim();
  return externalId ? `${slotId}__ext_${externalId}` : null;
}

export function newCampExternalId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function campAttendancePersonKey(mark: CampAttendanceMark): string {
  if (mark.kind === "member_walkin" && mark.clubRegistrationId) {
    return `camp_club_${mark.clubRegistrationId}`;
  }
  if (mark.kind === "external") {
    return `camp_ext_${mark.externalId ?? mark.id}`;
  }
  if (mark.campRegistrationId) {
    return `camp_${mark.campRegistrationId}`;
  }
  return `camp_mark_${mark.id}`;
}

/**
 * Normalise un document Firestore (y compris marks legacy sans `kind`).
 */
export function normalizeCampAttendanceMark(
  id: string,
  data: Record<string, unknown>
): CampAttendanceMark {
  const slotId = typeof data.slotId === "string" ? data.slotId : "";
  const campId = typeof data.campId === "string" ? data.campId : "";
  const date = typeof data.date === "string" ? data.date : "";
  const displayName =
    typeof data.displayName === "string" ? data.displayName : "Présent";
  const markedByUid =
    typeof data.markedByUid === "string" ? data.markedByUid : "";
  const markedAt =
    typeof data.markedAt === "string" ? data.markedAt : new Date().toISOString();

  const rawKind = typeof data.kind === "string" ? data.kind : null;
  let kind: CampAttendanceMarkKind = "enrolled";
  if (isCampAttendanceMarkKind(rawKind)) {
    kind = rawKind;
  } else if (id.includes("__club_")) {
    kind = "member_walkin";
  } else if (id.includes("__ext_")) {
    kind = "external";
  }

  const campRegistrationId =
    typeof data.campRegistrationId === "string" ? data.campRegistrationId : null;
  const clubRegistrationId =
    typeof data.clubRegistrationId === "string" ? data.clubRegistrationId : null;
  const externalId =
    typeof data.externalId === "string"
      ? data.externalId
      : kind === "external" && id.includes("__ext_")
        ? id.slice(id.indexOf("__ext_") + "__ext_".length)
        : null;

  // Legacy enrolled : id = slot__campRegistrationId sans champ kind
  const resolvedCampRegistrationId =
    campRegistrationId ??
    (kind === "enrolled" && slotId && id.startsWith(`${slotId}__`)
      ? id.slice(slotId.length + 2)
      : null);

  return {
    id,
    campId,
    slotId,
    date,
    kind,
    campRegistrationId: resolvedCampRegistrationId,
    clubRegistrationId,
    externalId,
    firstName: typeof data.firstName === "string" ? data.firstName : null,
    lastName: typeof data.lastName === "string" ? data.lastName : null,
    phone: typeof data.phone === "string" ? data.phone : null,
    note: typeof data.note === "string" ? data.note : null,
    displayName,
    markedByUid,
    markedAt,
  };
}
