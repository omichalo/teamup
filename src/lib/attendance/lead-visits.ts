import type { Firestore } from "firebase-admin/firestore";
import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import { ATTENDANCE_MARKS_COLLECTION } from "./constants";
import { formatAttendanceSlotDisplay } from "./slot-display";
import { mapMarkDoc } from "./store";
import type {
  AttendanceLead,
  AttendanceLeadListItem,
  AttendanceLeadVisit,
} from "./types";

export async function listGuestMarksByLeadIds(
  db: Firestore,
  leadIds: string[]
): Promise<Map<string, ReturnType<typeof mapMarkDoc>[]>> {
  const byLead = new Map<string, ReturnType<typeof mapMarkDoc>[]>();
  if (leadIds.length === 0) {
    return byLead;
  }
  const unique = [...new Set(leadIds)];
  const snaps = await Promise.all(
    unique.map((leadId) =>
      db.collection(ATTENDANCE_MARKS_COLLECTION).where("leadId", "==", leadId).get()
    )
  );
  for (let i = 0; i < unique.length; i += 1) {
    const leadId = unique[i];
    const snap = snaps[i];
    if (!leadId || !snap) continue;
    const marks = snap.docs
      .map((doc) => mapMarkDoc(doc.id, doc.data()))
      .filter((mark) => mark.kind === "guest")
      .sort((a, b) => b.date.localeCompare(a.date) || a.slotId.localeCompare(b.slotId));
    byLead.set(leadId, marks);
  }
  return byLead;
}

export function buildLeadVisits(
  config: RegistrationConfigV1,
  marks: ReturnType<typeof mapMarkDoc>[]
): AttendanceLeadVisit[] {
  return marks.map((mark) => ({
    date: mark.date,
    slotId: mark.slotId,
    slotLabel: formatAttendanceSlotDisplay(config, mark.slotId),
  }));
}

export async function enrichLeadsWithVisits(
  db: Firestore,
  config: RegistrationConfigV1,
  leads: AttendanceLead[]
): Promise<AttendanceLeadListItem[]> {
  const marksByLead = await listGuestMarksByLeadIds(
    db,
    leads.map((lead) => lead.id)
  );
  return leads.map((lead) => {
    const marks = marksByLead.get(lead.id) ?? [];
    const visits = buildLeadVisits(config, marks);
    return {
      ...lead,
      visitCount: visits.length,
      visits,
    };
  });
}

export async function countGuestVisitsByLeadIds(
  db: Firestore,
  leadIds: string[]
): Promise<Map<string, number>> {
  const marksByLead = await listGuestMarksByLeadIds(db, leadIds);
  const counts = new Map<string, number>();
  for (const [leadId, marks] of marksByLead) {
    counts.set(leadId, marks.length);
  }
  return counts;
}
