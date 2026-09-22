import type { Firestore } from "firebase-admin/firestore";
import {
  ATTENDANCE_LEADS_COLLECTION,
  ATTENDANCE_MARKS_COLLECTION,
  LEAD_RECENTS_LIMIT,
  LEAD_REUSE_STATUSES,
  LEAD_SEARCH_LIMIT,
  LEAD_SEARCH_SCAN_LIMIT,
} from "./constants";
import { countGuestVisitsByLeadIds } from "./lead-visits";
import { displayNameFromParts } from "./roster";
import { normalizeSearchText } from "./search-members";
import { mapLeadDoc, mapMarkDoc } from "./store";
import type { AttendanceLeadSearchHit } from "./types";

const REUSE_STATUS_SET = new Set<string>(LEAD_REUSE_STATUSES);

export function maskLeadPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) {
    return "***";
  }
  return `${digits.slice(0, 2)}***${digits.slice(-2)}`;
}

export function leadMatchesQuery(
  firstName: string,
  lastName: string,
  phone: string,
  query: string
): boolean {
  const needle = normalizeSearchText(query);
  if (needle.length < 2) {
    return false;
  }
  const phoneDigits = phone.replace(/\D/g, "");
  const needleDigits = query.replace(/\D/g, "");
  if (needleDigits.length >= 3 && phoneDigits.includes(needleDigits)) {
    return true;
  }
  const haystack = normalizeSearchText(`${firstName} ${lastName}`);
  const tokens = needle.split(/\s+/).filter(Boolean);
  return tokens.every((token) => haystack.includes(token));
}

function toHit(params: {
  leadId: string;
  firstName: string;
  lastName: string;
  phone: string;
  alreadyPresent: boolean;
  visitCount: number;
  lastVisitDate?: string;
}): AttendanceLeadSearchHit {
  return {
    leadId: params.leadId,
    firstName: params.firstName,
    lastName: params.lastName,
    displayName: displayNameFromParts(params.firstName, params.lastName) || params.leadId,
    phone: maskLeadPhone(params.phone),
    alreadyPresent: params.alreadyPresent,
    visitCount: params.visitCount,
    ...(params.lastVisitDate ? { lastVisitDate: params.lastVisitDate } : {}),
  };
}

export async function searchReusableLeads(
  db: Firestore,
  params: { query: string; date: string; slotId: string }
): Promise<AttendanceLeadSearchHit[]> {
  const presentLeadIds = await loadPresentGuestLeadIds(db, params.date, params.slotId);
  const snap = await db
    .collection(ATTENDANCE_LEADS_COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(LEAD_SEARCH_SCAN_LIMIT)
    .get();

  const matched: Array<{
    leadId: string;
    firstName: string;
    lastName: string;
    phone: string;
    alreadyPresent: boolean;
  }> = [];
  for (const doc of snap.docs) {
    const lead = mapLeadDoc(doc.id, doc.data());
    if (!REUSE_STATUS_SET.has(lead.status)) {
      continue;
    }
    if (!leadMatchesQuery(lead.firstName, lead.lastName, lead.phone, params.query)) {
      continue;
    }
    matched.push({
      leadId: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      phone: lead.phone,
      alreadyPresent: presentLeadIds.has(lead.id),
    });
    if (matched.length >= LEAD_SEARCH_LIMIT) {
      break;
    }
  }

  const visitCounts = await countGuestVisitsByLeadIds(
    db,
    matched.map((item) => item.leadId)
  );
  return matched.map((item) =>
    toHit({
      ...item,
      visitCount: visitCounts.get(item.leadId) ?? 0,
    })
  );
}

export async function listRecentLeadsForSlot(
  db: Firestore,
  params: { date: string; slotId: string }
): Promise<AttendanceLeadSearchHit[]> {
  const presentLeadIds = await loadPresentGuestLeadIds(db, params.date, params.slotId);
  const snap = await db
    .collection(ATTENDANCE_MARKS_COLLECTION)
    .where("slotId", "==", params.slotId)
    .get();

  const guestMarks = snap.docs
    .map((doc) => mapMarkDoc(doc.id, doc.data()))
    .filter(
      (mark) =>
        mark.kind === "guest" &&
        Boolean(mark.leadId) &&
        mark.date !== params.date
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  const lastVisitByLead = new Map<string, string>();
  for (const mark of guestMarks) {
    const leadId = mark.leadId;
    if (!leadId || lastVisitByLead.has(leadId)) {
      continue;
    }
    lastVisitByLead.set(leadId, mark.date);
  }

  const ordered = [...lastVisitByLead.entries()];
  if (ordered.length === 0) {
    return [];
  }

  const snaps = await db.getAll(
    ...ordered.map(([leadId]) =>
      db.collection(ATTENDANCE_LEADS_COLLECTION).doc(leadId)
    )
  );

  const matched: Array<{
    leadId: string;
    firstName: string;
    lastName: string;
    phone: string;
    alreadyPresent: boolean;
    lastVisitDate: string;
  }> = [];
  for (let i = 0; i < snaps.length; i += 1) {
    const leadSnap = snaps[i];
    const entry = ordered[i];
    if (!leadSnap || !entry || !leadSnap.exists) {
      continue;
    }
    const [leadId, lastVisitDate] = entry;
    const lead = mapLeadDoc(leadId, leadSnap.data() ?? {});
    if (!REUSE_STATUS_SET.has(lead.status)) {
      continue;
    }
    matched.push({
      leadId: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      phone: lead.phone,
      alreadyPresent: presentLeadIds.has(lead.id),
      lastVisitDate,
    });
    if (matched.length >= LEAD_RECENTS_LIMIT) {
      break;
    }
  }

  const visitCounts = await countGuestVisitsByLeadIds(
    db,
    matched.map((item) => item.leadId)
  );
  return matched.map((item) =>
    toHit({
      ...item,
      visitCount: visitCounts.get(item.leadId) ?? 0,
    })
  );
}

async function loadPresentGuestLeadIds(
  db: Firestore,
  date: string,
  slotId: string
): Promise<Set<string>> {
  const snap = await db
    .collection(ATTENDANCE_MARKS_COLLECTION)
    .where("slotId", "==", slotId)
    .where("date", "==", date)
    .get();
  const ids = new Set<string>();
  for (const doc of snap.docs) {
    const mark = mapMarkDoc(doc.id, doc.data());
    if (mark.kind === "guest" && mark.leadId) {
      ids.add(mark.leadId);
    }
  }
  return ids;
}
