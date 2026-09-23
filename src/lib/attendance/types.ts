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
  cancelled: boolean;
};

export type AttendanceSlotCancellation = {
  id: string;
  date: string;
  slotId: string;
  siteId: string;
  seasonLabel: string;
  cancelledAt: string;
  cancelledByUid: string;
};

export type AttendanceWeekSummary = {
  weekStart: string;
  weekEnd: string;
  weekActiveCount: number;
  weekCancelledCount: number;
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
  cancelled: boolean;
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

/** Essai réutilisable au pointage (champs limités pour le coach). */
export type AttendanceLeadSearchHit = {
  leadId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  phone: string;
  alreadyPresent: boolean;
  visitCount: number;
  lastVisitDate?: string | undefined;
};

/** Passage d'essai (pour la file bureau). */
export type AttendanceLeadVisit = {
  date: string;
  slotId: string;
  slotLabel: string;
};

/** Lead enrichi pour la file « Essais à relancer ». */
export type AttendanceLeadListItem = AttendanceLead & {
  visitCount: number;
  visits: AttendanceLeadVisit[];
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

/** Agrégat d'une séance pointée (évolution temporelle). */
export type AttendanceSessionPoint = {
  date: string;
  enrolled: number;
  walkin: number;
  guest: number;
  total: number;
};

export type AttendanceSlotAnalyticsKpis = {
  pointedSessionCount: number;
  cancelledSessionCount: number;
  avgPresentEnrolled: number | null;
  avgPresentTotal: number | null;
  peakTotal: number | null;
  peakDate: string | null;
  seasonWalkinTotal: number;
  seasonGuestTotal: number;
  avgPlayerRate: number | null;
  /** Moyenne présents totaux / capacité sur séances pointées ; null si pas de capacité. */
  avgOccupancyVsCapacity: number | null;
  capacity: number | null;
  enrolledCount: number;
};

export type AttendanceSlotAnalytics = {
  date: string;
  slotId: string;
  seasonLabel: string;
  kpis: AttendanceSlotAnalyticsKpis;
  sessions: AttendanceSessionPoint[];
  players: AttendancePlayerStat[];
};
