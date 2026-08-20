import { computeAgeAt } from "@/lib/club-registration/age";
import type { AttendanceMark, AttendanceRosterPerson, AttendanceSessionPayload, AttendanceSlotOption } from "./types";
import { attendanceAlertsFromRegistration } from "./alerts";
import { attendancePersonKey } from "./mark-id";

function readString(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  return typeof value === "string" ? value : "";
}

export function displayNameFromParts(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

export function mapRegistrationToRosterPerson(
  id: string,
  data: Record<string, unknown>,
  present: boolean,
  addSlotRequested: boolean
): AttendanceRosterPerson {
  const firstName = readString(data, "firstName");
  const lastName = readString(data, "lastName");
  const birthDate = readString(data, "birthDate");
  return {
    personKey: `reg_${id}`,
    kind: "enrolled",
    registrationId: id,
    firstName,
    lastName,
    displayName: displayNameFromParts(firstName, lastName) || id,
    age: birthDate ? computeAgeAt(birthDate) : null,
    alerts: attendanceAlertsFromRegistration(data),
    present,
    addSlotRequested,
  };
}

export function extraPersonFromMark(mark: AttendanceMark): AttendanceRosterPerson {
  const parts = mark.displayName.trim().split(/\s+/);
  const firstName = parts[0] ?? mark.displayName;
  const lastName = parts.slice(1).join(" ");
  return {
    personKey: attendancePersonKey(mark) ?? mark.id,
    kind: mark.kind,
    registrationId: mark.registrationId,
    leadId: mark.leadId,
    firstName,
    lastName,
    displayName: mark.displayName,
    age: null,
    alerts: [],
    present: true,
    addSlotRequested: mark.addSlotRequested === true,
  };
}

export function buildSessionPayload(params: {
  date: string;
  slot: AttendanceSlotOption;
  registrations: Array<{ id: string; data: Record<string, unknown> }>;
  marks: AttendanceMark[];
}): AttendanceSessionPayload {
  const marksByReg = new Map<string, AttendanceMark>();
  const extraMarks: AttendanceMark[] = [];
  for (const mark of params.marks) {
    if (mark.kind === "enrolled" && mark.registrationId) {
      marksByReg.set(mark.registrationId, mark);
    } else {
      extraMarks.push(mark);
    }
  }

  const roster = params.registrations
    .map((item) => {
      const mark = marksByReg.get(item.id);
      return mapRegistrationToRosterPerson(
        item.id,
        item.data,
        Boolean(mark),
        mark?.addSlotRequested === true
      );
    })
    .sort((a, b) => a.lastName.localeCompare(b.lastName, "fr") || a.firstName.localeCompare(b.firstName, "fr"));

  const extras = extraMarks
    .map(extraPersonFromMark)
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "fr"));

  return {
    date: params.date,
    slot: params.slot,
    roster,
    extras,
    counts: {
      enrolled: roster.length,
      presentEnrolled: roster.filter((person) => person.present).length,
      walkin: extras.filter((person) => person.kind === "walkin").length,
      guest: extras.filter((person) => person.kind === "guest").length,
    },
  };
}
