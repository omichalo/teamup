import type { Firestore } from "firebase-admin/firestore";
import { COLLECTION as REGISTRATIONS_COLLECTION } from "@/lib/club-registration/list-registrations";
import { effectiveLinkedAccountUids } from "@/lib/club-registration/effective-linked-accounts";
import { isRejectedRegistration } from "@/lib/attendance/alerts";
import {
  MEMBER_SEARCH_LIMIT,
  MEMBER_SEARCH_SCAN_LIMIT,
} from "@/lib/attendance/constants";
import { registrationMatchesQuery } from "@/lib/attendance/search-members";
import { displayNameFromParts } from "@/lib/attendance/roster";

export type CampMemberSearchHit = {
  registrationId: string;
  submitterUid: string;
  firstName: string;
  lastName: string;
  displayName: string;
  birthDate: string;
  phone: string;
  email: string;
};

function readString(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  return typeof value === "string" ? value.trim() : "";
}

/** Recherche d’adhérents club pour préremplir une inscription stage. */
export async function searchClubMembersForCamp(
  db: Firestore,
  query: string
): Promise<CampMemberSearchHit[]> {
  const snap = await db
    .collection(REGISTRATIONS_COLLECTION)
    .orderBy("submittedAt", "desc")
    .limit(MEMBER_SEARCH_SCAN_LIMIT)
    .get();

  const hits: CampMemberSearchHit[] = [];
  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    if (isRejectedRegistration(data)) continue;

    const firstName = readString(data, "firstName");
    const lastName = readString(data, "lastName");
    if (!registrationMatchesQuery(firstName, lastName, query)) continue;

    const linkedUids = effectiveLinkedAccountUids(data);
    const portalOwnerUid = linkedUids[0] || readString(data, "submitterUid");
    if (!portalOwnerUid) continue;

    const linkedEmails = Array.isArray(data.linkedAccountEmails)
      ? data.linkedAccountEmails.filter(
          (email): email is string => typeof email === "string" && email.includes("@")
        )
      : [];

    hits.push({
      registrationId: doc.id,
      submitterUid: portalOwnerUid,
      firstName,
      lastName,
      displayName: displayNameFromParts(firstName, lastName) || doc.id,
      birthDate: readString(data, "birthDate"),
      phone: readString(data, "adherentPhonePrimary"),
      email:
        linkedEmails[0] ||
        readString(data, "adherentEmail") ||
        readString(data, "submitterAccountEmail"),
    });
    if (hits.length >= MEMBER_SEARCH_LIMIT) break;
  }
  return hits;
}
