import type { AttendanceMarkKind } from "./constants";

export function attendanceSessionId(date: string, slotId: string): string {
  return `${date}__${slotId}`;
}

export function attendancePersonKey(params: {
  kind: AttendanceMarkKind;
  registrationId?: string | undefined;
  leadId?: string | undefined;
}): string | null {
  if (params.kind === "guest") {
    return params.leadId ? `guest_${params.leadId}` : null;
  }
  return params.registrationId ? `reg_${params.registrationId}` : null;
}

export function buildAttendanceMarkId(params: {
  date: string;
  slotId: string;
  kind: AttendanceMarkKind;
  registrationId?: string | undefined;
  leadId?: string | undefined;
}): string | null {
  const personKey = attendancePersonKey(params);
  if (!personKey) {
    return null;
  }
  return `${params.date}__${params.slotId}__${personKey}`;
}
