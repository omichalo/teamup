import type { AttendanceAlert, AttendanceLeadStatus, AttendanceMarkKind } from "./constants";

export type AttendanceMark = {
  id: string;
  date: string;
  slotId: string;
  siteId: string;
  seasonLabel: string;
  sessionId: string;
  kind: AttendanceMarkKind;
  registrationId?: string | undefined;
  leadId?: string | undefined;
  displayName: string;
  markedAt: string;
  markedByUid: string;
  addSlotRequested?: boolean | undefined;
};

export type AttendanceLead = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | undefined;
  sourceDate: string;
  sourceSlotId: string;
  sourceSiteId: string;
  createdAt: string;
  createdByUid: string;
  status: AttendanceLeadStatus;
};

export type AttendanceSlotOption = {
  slotId: string;
  label: string;
  siteId: string;
  siteLabel: string;
  gymnasiumName?: string | undefined;
  weekday: number;
  startMinutes: number;
  endMinutes: number;
  highlighted: boolean;
  enrollmentsClosed: boolean;
};

export type AttendanceRosterPerson = {
  personKey: string;
  kind: AttendanceMarkKind;
  registrationId?: string | undefined;
  leadId?: string | undefined;
  firstName: string;
  lastName: string;
  displayName: string;
  age: number | null;
  alerts: AttendanceAlert[];
  present: boolean;
  addSlotRequested: boolean;
};

export type AttendanceSessionPayload = {
  date: string;
  slot: AttendanceSlotOption;
  roster: AttendanceRosterPerson[];
  extras: AttendanceRosterPerson[];
  counts: {
    enrolled: number;
    presentEnrolled: number;
    walkin: number;
    guest: number;
  };
};

export type AttendanceMemberSearchHit = {
  registrationId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  alreadyOnSlot: boolean;
  alerts: AttendanceAlert[];
};

export type AttendancePlayerStat = {
  registrationId: string;
  displayName: string;
  presentCount: number;
  expectedCount: number;
  rate: number | null;
};

export type AttendanceSlotStats = {
  date: string;
  slotId: string;
  enrolled: number;
  presentEnrolled: number;
  walkin: number;
  guest: number;
  players: AttendancePlayerStat[];
};
