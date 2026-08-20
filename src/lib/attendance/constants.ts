export const ATTENDANCE_MARKS_COLLECTION = "attendanceMarks";
export const ATTENDANCE_LEADS_COLLECTION = "attendanceLeads";
export const ATTENDANCE_TIMEZONE = "Europe/Paris";

export const ATTENDANCE_MARK_KINDS = ["enrolled", "walkin", "guest"] as const;
export type AttendanceMarkKind = (typeof ATTENDANCE_MARK_KINDS)[number];

export const ATTENDANCE_LEAD_STATUSES = [
  "open",
  "contacted",
  "converted",
  "dismissed",
] as const;
export type AttendanceLeadStatus = (typeof ATTENDANCE_LEAD_STATUSES)[number];

export const ATTENDANCE_ALERTS = ["unpaid", "certificate", "pps"] as const;
export type AttendanceAlert = (typeof ATTENDANCE_ALERTS)[number];

export const ATTENDANCE_ALERT_LABELS: Record<AttendanceAlert, string> = {
  unpaid: "Paiement",
  certificate: "Certificat",
  pps: "PPS",
};

export const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export const MEMBER_SEARCH_LIMIT = 20;
export const MEMBER_SEARCH_SCAN_LIMIT = 500;
export const LEADS_PAGE_SIZE_DEFAULT = 50;

export const ATTENDANCE_LEAD_STATUS_LABELS: Record<AttendanceLeadStatus, string> = {
  open: "À relancer",
  contacted: "Contacté",
  converted: "Inscrit",
  dismissed: "Classé",
};

export function isAttendanceLeadStatus(
  value: string | null | undefined
): value is AttendanceLeadStatus {
  return (
    typeof value === "string" &&
    (ATTENDANCE_LEAD_STATUSES as readonly string[]).includes(value)
  );
}
