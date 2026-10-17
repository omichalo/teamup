import type { Firestore } from "firebase-admin/firestore";
import {
  attendanceAlertsFromRegistration,
  isRejectedRegistration,
} from "@/lib/attendance/alerts";
import { MEMBER_SEARCH_LIMIT, MEMBER_SEARCH_SCAN_LIMIT } from "@/lib/attendance/constants";
import { displayNameFromParts } from "@/lib/attendance/roster";
import {
  normalizeSearchText,
  registrationMatchesQuery,
} from "@/lib/attendance/search-members";
import type { AttendanceMemberSearchHit } from "@/lib/attendance/types";
import { COLLECTION as REGISTRATIONS_COLLECTION } from "@/lib/club-registration/list-registrations";
import { listMarksForSlot, listRegistrationsForSlot } from "./store";

/**
 * Recherche d’adhérents pour le walk-in stage (cas B).
 * Exclut les dossiers déjà inscrits sur le créneau stage ou déjà pointés en member_walkin.
 */
export async function searchMembersForCampSlot(
  db: Firestore,
  query: string,
  slotId: string
): Promise<AttendanceMemberSearchHit[]> {
  const [enrolled, marks, snap] = await Promise.all([
    listRegistrationsForSlot(db, slotId),
    listMarksForSlot(db, slotId),
    db
      .collection(REGISTRATIONS_COLLECTION)
      .orderBy("submittedAt", "desc")
      .limit(MEMBER_SEARCH_SCAN_LIMIT)
      .get(),
  ]);

  const enrolledClubIds = new Set(
    enrolled
      .map((reg) => reg.clubRegistrationId)
      .filter((id): id is string => typeof id === "string" && id.length > 0)
  );
  const walkinClubIds = new Set(
    marks
      .filter((mark) => mark.kind === "member_walkin" && mark.clubRegistrationId)
      .map((mark) => mark.clubRegistrationId as string)
  );

  const hits: AttendanceMemberSearchHit[] = [];
  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    if (isRejectedRegistration(data)) {
      continue;
    }
    if (enrolledClubIds.has(doc.id) || walkinClubIds.has(doc.id)) {
      continue;
    }
    const firstName = typeof data.firstName === "string" ? data.firstName : "";
    const lastName = typeof data.lastName === "string" ? data.lastName : "";
    if (!registrationMatchesQuery(firstName, lastName, query)) {
      continue;
    }
    // garde-fou : needle min déjà dans registrationMatchesQuery
    if (normalizeSearchText(query).length < 2) {
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
