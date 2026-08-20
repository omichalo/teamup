import type { Firestore } from "firebase-admin/firestore";
import { COLLECTION as REGISTRATIONS_COLLECTION } from "@/lib/club-registration/list-registrations";
import { MEMBER_SEARCH_LIMIT, MEMBER_SEARCH_SCAN_LIMIT } from "./constants";
import { attendanceAlertsFromRegistration, isRejectedRegistration } from "./alerts";
import { displayNameFromParts } from "./roster";
import type { AttendanceMemberSearchHit } from "./types";

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function registrationMatchesQuery(
  firstName: string,
  lastName: string,
  query: string
): boolean {
  const needle = normalizeSearchText(query);
  if (needle.length < 2) {
    return false;
  }
  const haystack = normalizeSearchText(`${firstName} ${lastName}`);
  const tokens = needle.split(/\s+/).filter(Boolean);
  return tokens.every((token) => haystack.includes(token));
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

export async function searchMembersNotOnSlot(
  db: Firestore,
  query: string,
  slotId: string
): Promise<AttendanceMemberSearchHit[]> {
  const snap = await db
    .collection(REGISTRATIONS_COLLECTION)
    .orderBy("submittedAt", "desc")
    .limit(MEMBER_SEARCH_SCAN_LIMIT)
    .get();

  const hits: AttendanceMemberSearchHit[] = [];
  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    if (isRejectedRegistration(data)) {
      continue;
    }
    const firstName = typeof data.firstName === "string" ? data.firstName : "";
    const lastName = typeof data.lastName === "string" ? data.lastName : "";
    if (!registrationMatchesQuery(firstName, lastName, query)) {
      continue;
    }
    const slotIds = readStringArray(data.slotIds);
    const alreadyOnSlot = slotIds.includes(slotId);
    if (alreadyOnSlot) {
      continue;
    }
    hits.push({
      registrationId: doc.id,
      firstName,
      lastName,
      displayName: displayNameFromParts(firstName, lastName) || doc.id,
      alreadyOnSlot: false,
      alerts: attendanceAlertsFromRegistration(data),
    });
    if (hits.length >= MEMBER_SEARCH_LIMIT) {
      break;
    }
  }
  return hits;
}
