import type { AttendanceAlert } from "@/lib/attendance/constants";

export const SLOT_FILL_STATUSES = ["ok", "near", "full", "over", "unset"] as const;
export type SlotFillStatus = (typeof SLOT_FILL_STATUSES)[number];

export type SlotFillSnapshot = {
  enrolledCount: number;
  capacity: number | undefined;
  rate: number | null;
  status: SlotFillStatus;
};

export type SlotOccupancySummary = SlotFillSnapshot & {
  slotId: string;
  label: string;
  siteId: string;
  siteLabel: string;
  gymnasiumName?: string | undefined;
  weekday: number | null;
  startMinutes: number | null;
  endMinutes: number | null;
  scheduleLabel: string | null;
  enabled: boolean;
  enrollmentsClosed: boolean;
};

export type SlotOccupancySiteGroup = {
  siteId: string;
  siteLabel: string;
  gymnasiumName?: string | undefined;
  slots: SlotOccupancySummary[];
};

export type SlotOccupancyEnrolledPerson = {
  personKey: string;
  registrationId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  age: number | null;
  alerts: AttendanceAlert[];
};

export const SLOT_FILL_STATUS_LABELS: Record<SlotFillStatus, string> = {
  ok: "Places disponibles",
  near: "Presque complet",
  full: "Complet",
  over: "Surcharge",
  unset: "Capacité non paramétrée",
};

export const SLOT_FILL_STATUS_HELP: Record<SlotFillStatus, string> = {
  ok: "Moins de 80 % de la capacité du créneau.",
  near: "Au moins 80 % de la capacité, sans l'atteindre (ex. 17 inscrits pour 20 places).",
  full: "Autant d'inscrits que la capacité du créneau.",
  over: "Plus d'inscrits que la capacité du créneau (ex. 22 inscrits pour 20 places).",
  unset: "Aucune capacité n'a été saisie pour ce créneau dans le paramétrage.",
};

