import type { Firestore } from "firebase-admin/firestore";
import {
  campAttendancePersonKey,
} from "@/lib/camps/attendance-mark";
import {
  getSlotsByIds,
  listMarksForSlot,
  listRegistrationsForSlot,
} from "@/lib/camps/store";
import { campSlotToAttendanceOption } from "./camp-slots";
import type {
  AttendanceRosterKind,
  AttendanceRosterPerson,
  AttendanceSessionPayload,
} from "./types";

function splitName(displayName: string): { firstName: string; lastName: string } {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0] ?? "", lastName: "" };
  }
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

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

  const enrolledMarks = new Map(
    marks
      .filter((m) => m.kind === "enrolled" && m.campRegistrationId)
      .map((m) => [m.campRegistrationId as string, m])
  );

  const roster: AttendanceRosterPerson[] = registrations.map((reg) => {
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
      present: enrolledMarks.has(reg.id),
      addSlotRequested: false,
      isClubMember: reg.isClubMember,
    };
  });

  const extras: AttendanceRosterPerson[] = [];
  for (const mark of marks) {
    if (mark.kind === "enrolled") {
      continue;
    }
    const kind: AttendanceRosterKind =
      mark.kind === "member_walkin" ? "member_walkin" : "external";
    const names =
      mark.firstName || mark.lastName
        ? {
            firstName: mark.firstName ?? "",
            lastName: mark.lastName ?? "",
          }
        : splitName(mark.displayName);
    extras.push({
      personKey: campAttendancePersonKey(mark),
      kind,
      registrationId:
        mark.kind === "member_walkin"
          ? mark.clubRegistrationId ?? undefined
          : undefined,
      markId: mark.id,
      externalId: mark.externalId ?? undefined,
      firstName: names.firstName,
      lastName: names.lastName,
      displayName: mark.displayName,
      age: null,
      alerts: [],
      present: true,
      addSlotRequested: false,
      isClubMember: mark.kind === "member_walkin" ? true : false,
    });
  }

  const presentEnrolled = roster.filter((p) => p.present).length;
  const memberWalkin = extras.filter((p) => p.kind === "member_walkin").length;
  const external = extras.filter((p) => p.kind === "external").length;

  return {
    date: params.date,
    slot: campSlotToAttendanceOption(slot, 12 * 60),
    cancelled: slot.cancelled,
    coachMessage: null,
    roster,
    extras,
    counts: {
      enrolled: roster.length,
      presentEnrolled,
      walkin: memberWalkin,
      guest: 0,
      external,
    },
  };
}
