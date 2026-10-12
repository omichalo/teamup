import type { Firestore } from "firebase-admin/firestore";
import {
  getSlotsByIds,
  listMarksForSlot,
  listRegistrationsForSlot,
} from "@/lib/camps/store";
import { campSlotToAttendanceOption } from "./camp-slots";
import type { AttendanceSessionPayload } from "./types";

export async function buildCampAttendanceSession(params: {
  db: Firestore;
  date: string;
  slotId: string;
}): Promise<AttendanceSessionPayload | null> {
  const slots = await getSlotsByIds(params.db, [params.slotId]);
  const slot = slots[0];
  if (!slot || slot.date !== params.date) {
    return null;
  }

  const [registrations, marks] = await Promise.all([
    listRegistrationsForSlot(params.db, params.slotId),
    listMarksForSlot(params.db, params.slotId),
  ]);

  const markedIds = new Set(marks.map((m) => m.campRegistrationId));
  const roster = registrations.map((reg) => {
    const displayName = `${reg.firstName} ${reg.lastName}`.trim();
    return {
      personKey: `camp_${reg.id}`,
      kind: "enrolled" as const,
      registrationId: reg.id,
      firstName: reg.firstName,
      lastName: reg.lastName,
      displayName,
      age: null,
      alerts: [],
      present: markedIds.has(reg.id),
      addSlotRequested: false,
    };
  });

  const presentEnrolled = roster.filter((p) => p.present).length;

  return {
    date: params.date,
    slot: campSlotToAttendanceOption(slot, 12 * 60),
    cancelled: slot.cancelled,
    coachMessage: null,
    roster,
    extras: [],
    counts: {
      enrolled: roster.length,
      presentEnrolled,
      walkin: 0,
      guest: 0,
    },
  };
}
