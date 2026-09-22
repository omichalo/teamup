#!/usr/bin/env tsx
/**
 * Fusionne les doublons attendanceLeads (prod ou staging).
 *
 * Usage :
 *   npx tsx scripts/merge-attendance-lead-duplicates.ts --project sqyping-teamup --credentials <adminsdk.json>
 *   npx tsx scripts/merge-attendance-lead-duplicates.ts --project sqyping-teamup --credentials <adminsdk.json> --apply
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

type Lead = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  status: string;
  sourceDate: string;
  sourceSlotId: string;
  sourceSiteId: string;
  createdAt: string;
  createdByUid: string;
  raw: Record<string, unknown>;
};

type Mark = {
  id: string;
  date: string;
  slotId: string;
  leadId: string;
  displayName: string;
  payload: Record<string, unknown>;
};

type MergeGroup = {
  label: string;
  canonicalId: string;
  duplicateIds: string[];
  rename?: { firstName: string; lastName: string };
};

function readArgValue(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Valeur manquante pour ${flag}`);
  }
  return value;
}

function normPhone(p: unknown): string {
  return String(p ?? "").replace(/\D/g, "");
}

function normName(s: unknown): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function isPlaceholderPhone(p: string): boolean {
  const d = normPhone(p);
  if (d.length < 8) return true;
  if (/^0+$/.test(d)) return true;
  if (/^(\d)\1+$/.test(d)) return true;
  return false;
}

function maskPhone(p: string): string {
  const d = normPhone(p);
  if (d.length < 4) return "***";
  return `${d.slice(0, 2)}***${d.slice(-2)}`;
}

function scoreLead(l: Lead): number {
  let s = 0;
  if (!isPlaceholderPhone(l.phone)) s += 100;
  if (l.email) s += 20;
  return s;
}

function buildMarkId(date: string, slotId: string, leadId: string): string {
  return `${date}__${slotId}__guest_${leadId}`;
}

function fullName(l: Lead): string {
  return `${l.firstName} ${l.lastName}`.trim();
}

function parseArgs() {
  return {
    apply: process.argv.includes("--apply"),
    projectId: readArgValue("--project") ?? "sqyping-teamup",
    credentialsPath: readArgValue("--credentials"),
  };
}

function initFirebase(projectId: string, credentialsPath: string): Firestore {
  if (!getApps().length) {
    const sa = JSON.parse(fs.readFileSync(path.resolve(credentialsPath), "utf8"));
    initializeApp({ credential: cert(sa), projectId });
  }
  return getFirestore();
}

async function loadLeads(db: Firestore): Promise<Lead[]> {
  const snap = await db.collection("attendanceLeads").get();
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      firstName: String(data.firstName ?? ""),
      lastName: String(data.lastName ?? ""),
      phone: String(data.phone ?? ""),
      email: data.email ? String(data.email) : undefined,
      status: String(data.status ?? ""),
      sourceDate: String(data.sourceDate ?? ""),
      sourceSlotId: String(data.sourceSlotId ?? ""),
      sourceSiteId: String(data.sourceSiteId ?? ""),
      createdAt: String(data.createdAt ?? ""),
      createdByUid: String(data.createdByUid ?? ""),
      raw: data as Record<string, unknown>,
    };
  });
}

async function loadGuestMarks(db: Firestore): Promise<Mark[]> {
  const snap = await db.collection("attendanceMarks").where("kind", "==", "guest").get();
  return snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      date: String(data.date ?? ""),
      slotId: String(data.slotId ?? ""),
      leadId: String(data.leadId ?? ""),
      displayName: String(data.displayName ?? ""),
      payload: data,
    };
  });
}

function buildAutoNameGroups(leads: Lead[], excludeIds: Set<string>): MergeGroup[] {
  const byName = new Map<string, Lead[]>();
  for (const lead of leads) {
    if (excludeIds.has(lead.id)) continue;
    const key = `${normName(lead.firstName)}|${normName(lead.lastName)}`;
    if (!normName(lead.firstName) || !normName(lead.lastName)) continue;
    const list = byName.get(key) ?? [];
    list.push(lead);
    byName.set(key, list);
  }

  const groups: MergeGroup[] = [];
  for (const [, group] of byName.entries()) {
    if (group.length < 2) continue;
    const realPhones = new Set(
      group.filter((l) => !isPlaceholderPhone(l.phone)).map((l) => normPhone(l.phone)),
    );
    if (realPhones.size > 1) continue;

    const sorted = [...group].sort((a, b) => {
      const ds = scoreLead(b) - scoreLead(a);
      if (ds !== 0) return ds;
      return a.createdAt.localeCompare(b.createdAt);
    });
    groups.push({
      label: fullName(sorted[0]),
      canonicalId: sorted[0].id,
      duplicateIds: sorted.slice(1).map((l) => l.id),
    });
  }
  return groups;
}

function findArmandManualGroup(leads: Lead[]): MergeGroup | null {
  const candidates = leads.filter((l) => {
    const first = normName(l.firstName);
    const last = normName(l.lastName);
    if (first !== "armand") return false;
    return last.includes("montleau") || last.includes("monlau") || last.includes("monltleau");
  });
  if (candidates.length < 2) return null;

  const sorted = [...candidates].sort((a, b) => {
    const ds = scoreLead(b) - scoreLead(a);
    if (ds !== 0) return ds;
    return a.createdAt.localeCompare(b.createdAt);
  });

  return {
    label: "Armand De Montleau (manuel)",
    canonicalId: sorted[0].id,
    duplicateIds: sorted.slice(1).map((l) => l.id),
    rename: { firstName: "Armand", lastName: "De Montleau" },
  };
}

async function applyMerge(
  db: Firestore,
  leadsById: Map<string, Lead>,
  marksByLead: Map<string, Mark[]>,
  allMarks: Mark[],
  group: MergeGroup,
  apply: boolean,
): Promise<{ leadsDeleted: number; marksRewritten: number; marksDeletedOnly: number }> {
  const canonical = leadsById.get(group.canonicalId);
  if (!canonical) {
    throw new Error(`Lead canonique introuvable: ${group.canonicalId}`);
  }

  console.log(`\n--- ${group.label} (${1 + group.duplicateIds.length} → 1) ---`);
  console.log(
    `  CANONICAL id=${canonical.id} tel=${maskPhone(canonical.phone)} created=${canonical.createdAt}`,
  );

  const betterPhone = group.duplicateIds
    .map((id) => leadsById.get(id))
    .find((d) => d && !isPlaceholderPhone(d.phone) && isPlaceholderPhone(canonical.phone));
  const betterEmail = !canonical.email
    ? group.duplicateIds.map((id) => leadsById.get(id)).find((d) => d?.email)?.email
    : undefined;

  const patch: Record<string, unknown> = {};
  if (group.rename) {
    patch.firstName = group.rename.firstName;
    patch.lastName = group.rename.lastName;
  }
  if (betterPhone) patch.phone = betterPhone.phone;
  if (betterEmail) patch.email = betterEmail;

  if (Object.keys(patch).length > 0) {
    console.log(`  PATCH canonical: ${JSON.stringify({
      ...patch,
      phone: typeof patch.phone === "string" ? maskPhone(patch.phone) : undefined,
    })}`);
    if (apply) {
      await db.collection("attendanceLeads").doc(canonical.id).update(patch);
    }
  }

  let leadsDeleted = 0;
  let marksRewritten = 0;
  let marksDeletedOnly = 0;

  const canonicalSessionKeys = new Set(
    (marksByLead.get(canonical.id) ?? []).map((m) => `${m.date}__${m.slotId}`),
  );

  for (const dupId of group.duplicateIds) {
    const dup = leadsById.get(dupId);
    if (!dup) continue;
    console.log(
      `  DROP lead id=${dup.id} tel=${maskPhone(dup.phone)} | ${dup.sourceDate} ${dup.sourceSlotId}`,
    );

    for (const mark of marksByLead.get(dupId) ?? []) {
      const sessionKey = `${mark.date}__${mark.slotId}`;
      const newId = buildMarkId(mark.date, mark.slotId, canonical.id);

      if (canonicalSessionKeys.has(sessionKey)) {
        console.log(`    mark ${sessionKey}: DELETE only (conflit / déjà couvert)`);
        marksDeletedOnly += 1;
        if (apply) {
          await db.collection("attendanceMarks").doc(mark.id).delete();
        }
        continue;
      }

      const displayName = group.rename
        ? `${group.rename.firstName} ${group.rename.lastName}`
        : fullName(canonical);

      console.log(`    mark ${sessionKey}: REWRITE → ${newId}`);
      marksRewritten += 1;
      canonicalSessionKeys.add(sessionKey);

      if (apply) {
        const newPayload = {
          ...mark.payload,
          leadId: canonical.id,
          displayName,
        };
        await db.collection("attendanceMarks").doc(newId).set(newPayload);
        if (mark.id !== newId) {
          await db.collection("attendanceMarks").doc(mark.id).delete();
        }
      }
    }

    leadsDeleted += 1;
    if (apply) {
      await db.collection("attendanceLeads").doc(dupId).delete();
    }
  }

  return { leadsDeleted, marksRewritten, marksDeletedOnly };
}

async function main() {
  const args = parseArgs();
  if (!args.credentialsPath) {
    throw new Error("--credentials <adminsdk.json> requis");
  }

  const db = initFirebase(args.projectId, args.credentialsPath);
  console.log(`mode=${args.apply ? "APPLY" : "DRY-RUN"} project=${args.projectId}`);

  const leads = await loadLeads(db);
  const marks = await loadGuestMarks(db);
  const leadsById = new Map(leads.map((l) => [l.id, l]));
  const marksByLead = new Map<string, Mark[]>();
  for (const m of marks) {
    const list = marksByLead.get(m.leadId) ?? [];
    list.push(m);
    marksByLead.set(m.leadId, list);
  }

  const armand = findArmandManualGroup(leads);
  const excludeIds = new Set<string>();
  if (armand) {
    excludeIds.add(armand.canonicalId);
    for (const id of armand.duplicateIds) excludeIds.add(id);
  }

  const groups: MergeGroup[] = [];
  if (armand) groups.push(armand);
  groups.push(...buildAutoNameGroups(leads, excludeIds));

  console.log(`\nFusions prévues: ${groups.length}`);
  let leadsDeleted = 0;
  let marksRewritten = 0;
  let marksDeletedOnly = 0;

  for (const group of groups) {
    const result = await applyMerge(db, leadsById, marksByLead, marks, group, args.apply);
    leadsDeleted += result.leadsDeleted;
    marksRewritten += result.marksRewritten;
    marksDeletedOnly += result.marksDeletedOnly;
  }

  console.log("\n========== RÉSUMÉ ==========");
  console.log(`merge_groups=${groups.length}`);
  console.log(`leads_deleted=${leadsDeleted}`);
  console.log(`marks_rewritten=${marksRewritten}`);
  console.log(`marks_deleted_only=${marksDeletedOnly}`);
  console.log(`leads_after_estimate=${leads.length - leadsDeleted}`);
  if (!args.apply) {
    console.log("\nDry-run seulement. Relancer avec --apply pour écrire.");
  } else {
    console.log("\nApply terminé.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
