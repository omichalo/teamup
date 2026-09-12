#!/usr/bin/env ts-node

/**
 * Répare les documents `availabilities` corrompus par `set(..., { merge: true })`
 * avec des clés `players.<licence>` (champs littéraux pointés au lieu du map `players`).
 *
 * Usage :
 *   # Dry-run staging (.env.local)
 *   npx tsx scripts/repair-availability-dotted-players.ts
 *
 *   # Production
 *   npx tsx scripts/repair-availability-dotted-players.ts --project sqyping-teamup --use-adc
 *
 *   # Appliquer
 *   ... --apply
 */
import * as dotenv from "dotenv";
import * as fs from "node:fs";
import * as path from "node:path";
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { FieldPath, FieldValue, getFirestore } from "firebase-admin/firestore";
import { normalizePlayersMap } from "../src/lib/availability/normalize-players-map";

const COLLECTION = "availabilities";
const DOTTED_PLAYER_FIELD = /^players\.(.+)$/;

type ScriptArgs = {
  apply: boolean;
  projectId: string | null;
  useAdc: boolean;
  credentialsPath: string | null;
};

function readArgValue(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return null;
  }
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
  if (getApps().length > 0) {
    return;
  }

  if (args.credentialsPath) {
    const credentialsPath = path.resolve(args.credentialsPath);
    if (!fs.existsSync(credentialsPath)) {
      throw new Error(`Fichier credentials introuvable : ${credentialsPath}`);
    }
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
    initializeApp({
      credential: applicationDefault(),
      projectId,
    });
    return;
  }

  if (args.useAdc) {
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    initializeApp({
      credential: applicationDefault(),
      projectId,
    });
    return;
  }

  const envCredentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (!envCredentialsPath) {
    throw new Error(
      "Credentials Firebase non configurés.\n" +
        "Staging : .env.local (GOOGLE_APPLICATION_CREDENTIALS).\n" +
        "Production : --project sqyping-teamup --use-adc"
    );
  }

  const resolvedPath = path.resolve(envCredentialsPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`GOOGLE_APPLICATION_CREDENTIALS introuvable : ${resolvedPath}`);
  }

  initializeApp({
    credential: applicationDefault(),
    projectId,
  });
}

async function main(): Promise<void> {
  const projectId = resolveProjectId();
  initFirebase(projectId);
  const db = getFirestore();

  console.log(
    `[repair-availability] project=${projectId} mode=${dryRun ? "dry-run" : "APPLY"}`
  );

  const snap = await db.collection(COLLECTION).get();
  let corrupted = 0;
  let repaired = 0;

  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const dottedKeys = Object.keys(data).filter((key) => DOTTED_PLAYER_FIELD.test(key));
    if (dottedKeys.length === 0) {
      continue;
    }

    corrupted += 1;
    const players = normalizePlayersMap(data);
    console.log(
      `- ${doc.id}: ${dottedKeys.length} champ(s) pointé(s), ${Object.keys(players).length} joueur(s) normalisé(s)`
    );

    if (dryRun) {
      continue;
    }

    const updateArgs: Array<string | FieldPath | unknown> = [
      "players",
      players,
      "updatedAt",
      FieldValue.serverTimestamp(),
    ];
    for (const key of dottedKeys) {
      updateArgs.push(new FieldPath(key), FieldValue.delete());
    }

    await doc.ref.update(
      ...(updateArgs as [string | FieldPath, unknown, ...(string | FieldPath | unknown)[]])
    );
    repaired += 1;
  }

  console.log(
    `[repair-availability] done: scanned=${snap.size} corrupted=${corrupted} repaired=${repaired}`
  );
  if (dryRun && corrupted > 0) {
    console.log("Relancer avec --apply pour écrire les corrections.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
