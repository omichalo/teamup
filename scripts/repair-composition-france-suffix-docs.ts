#!/usr/bin/env ts-node

/**
 * Migre les compositionDefaults / compositions créés avec un suffixe saison
 * France (18368, 18369, 15954, 15955) vers les docs sans suffixe (alignés
 * disponibilités / UI post-fix idEpreuve).
 *
 * Usage :
 *   npx tsx scripts/repair-composition-france-suffix-docs.ts
 *   npx tsx scripts/repair-composition-france-suffix-docs.ts --project sqyping-teamup --use-adc
 *   ... --apply
 */
import * as dotenv from "dotenv";
import * as fs from "node:fs";
import * as path from "node:path";
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const FRANCE_SUFFIX_RE = /^(?<base>.+)_(?<id>18368|18369|15954|15955)$/;
const COLLECTIONS = ["compositionDefaults", "compositions"] as const;

type ScriptArgs = {
  apply: boolean;
  projectId: string | null;
  useAdc: boolean;
  credentialsPath: string | null;
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

function parseArgs(): ScriptArgs {
  return {
    apply: process.argv.includes("--apply"),
    projectId: readArgValue("--project"),
    useAdc: process.argv.includes("--use-adc"),
    credentialsPath: readArgValue("--credentials"),
  };
}

const args = parseArgs();
const dryRun = !args.apply;

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });
dotenv.config({ path: path.join(__dirname, "..", ".env") });

function resolveProjectId(): string {
  return (
    args.projectId?.trim() ||
    process.env.FB_PROJECT_ID?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    "sqyping-teamup-dev"
  );
}

function initFirebase(projectId: string): void {
  if (getApps().length > 0) return;

  if (args.credentialsPath) {
    const credentialsPath = path.resolve(args.credentialsPath);
    if (!fs.existsSync(credentialsPath)) {
      throw new Error(`Fichier credentials introuvable : ${credentialsPath}`);
    }
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
    initializeApp({ credential: applicationDefault(), projectId });
    return;
  }

  if (args.useAdc) {
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    initializeApp({ credential: applicationDefault(), projectId });
    return;
  }

  const envCredentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (!envCredentialsPath) {
    throw new Error(
      "Credentials Firebase non configurés.\n" +
        "Staging : .env.local. Prod : --project sqyping-teamup --use-adc"
    );
  }
  initializeApp({ credential: applicationDefault(), projectId });
}

function isTeamMap(value: unknown): value is Record<string, string[]> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeTeams(
  target: Record<string, string[]>,
  source: Record<string, string[]>
): { merged: Record<string, string[]>; added: string[]; skipped: string[] } {
  const merged = { ...target };
  const added: string[] = [];
  const skipped: string[] = [];
  for (const [teamId, players] of Object.entries(source)) {
    const existing = merged[teamId];
    if (!existing || existing.length === 0) {
      merged[teamId] = [...players];
      added.push(teamId);
    } else {
      skipped.push(teamId);
    }
  }
  return { merged, added, skipped };
}

async function repairCollection(
  collectionName: (typeof COLLECTIONS)[number]
): Promise<{ scanned: number; migrated: number }> {
  const db = getFirestore();
  const snap = await db.collection(collectionName).get();
  let migrated = 0;

  for (const doc of snap.docs) {
    const match = FRANCE_SUFFIX_RE.exec(doc.id);
    if (!match?.groups?.base) continue;

    const targetId = match.groups.base;
    const sourceData = doc.data();
    const sourceTeams = isTeamMap(sourceData.teams) ? sourceData.teams : {};
    const targetRef = db.collection(collectionName).doc(targetId);
    const targetSnap = await targetRef.get();

    console.log(
      `- ${collectionName}/${doc.id} → ${targetId} (${Object.keys(sourceTeams).length} équipe(s) source)`
    );

    if (dryRun) {
      migrated += 1;
      continue;
    }

    if (!targetSnap.exists) {
      await targetRef.set({
        ...sourceData,
        idEpreuve: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      await doc.ref.delete();
      migrated += 1;
      console.log(`  créé ${targetId}, supprimé ${doc.id}`);
      continue;
    }

    const targetData = targetSnap.data() ?? {};
    const targetTeams = isTeamMap(targetData.teams) ? targetData.teams : {};
    const { merged, added, skipped } = mergeTeams(targetTeams, sourceTeams);

    await targetRef.set(
      {
        ...targetData,
        teams: merged,
        idEpreuve: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    await doc.ref.delete();
    migrated += 1;
    console.log(
      `  fusionné dans ${targetId} (ajoutés=${added.length}, conservés=${skipped.length}), supprimé ${doc.id}`
    );
  }

  return { scanned: snap.size, migrated };
}

async function main(): Promise<void> {
  const projectId = resolveProjectId();
  initFirebase(projectId);
  console.log(
    `[repair-composition-france-suffix] project=${projectId} mode=${dryRun ? "dry-run" : "APPLY"}`
  );

  let totalMigrated = 0;
  for (const collectionName of COLLECTIONS) {
    const result = await repairCollection(collectionName);
    console.log(
      `[${collectionName}] scanned=${result.scanned} migrated=${result.migrated}`
    );
    totalMigrated += result.migrated;
  }

  if (dryRun && totalMigrated > 0) {
    console.log("Relancer avec --apply pour écrire les corrections.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
