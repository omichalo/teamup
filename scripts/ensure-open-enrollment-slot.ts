#!/usr/bin/env tsx
/**
 * Ajoute le créneau virtuel « inscription libre » à la config active (et draft) si absent.
 *
 * Usage :
 *   npx tsx scripts/ensure-open-enrollment-slot.ts --project sqyping-teamup-dev --use-adc
 *   npx tsx scripts/ensure-open-enrollment-slot.ts --project sqyping-teamup --use-adc --apply
 */
import * as dotenv from "dotenv";
import * as fs from "node:fs";
import * as path from "node:path";
import { initializeApp, applicationDefault, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  ensureOpenEnrollmentInConfig,
  OPEN_ENROLLMENT_SLOT_ID,
} from "../src/lib/club-registration-config/open-enrollment";
import { registrationConfigV1Schema } from "../src/lib/club-registration-config/schema";
import type { RegistrationConfigV1 } from "../src/lib/club-registration-config/types";

/** Constantes locales — ne pas importer `store.ts` (init Firebase Admin trop tôt). */
const REGISTRATION_CONFIG_COLLECTION = "clubRegistrationConfig";
const REGISTRATION_CONFIG_ACTIVE_ID = "active";
const REGISTRATION_CONFIG_DRAFT_ID = "draft";

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
  if (getApps().length) return;
  if (args.useAdc) {
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    initializeApp({ credential: applicationDefault(), projectId });
    return;
  }
  const credentialsPath =
    args.credentialsPath?.trim() ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim() ||
    null;
  if (credentialsPath) {
    initializeApp({
      credential: cert(JSON.parse(fs.readFileSync(path.resolve(credentialsPath), "utf8"))),
      projectId,
    });
    return;
  }
  initializeApp({ credential: applicationDefault(), projectId });
}

function parseConfig(raw: unknown): RegistrationConfigV1 {
  const parsed = registrationConfigV1Schema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Config invalide : ${parsed.error.message}`);
  }
  return parsed.data;
}

async function ensureDoc(
  docId: string,
  apply: boolean
): Promise<{ docId: string; changed: boolean; action: string }> {
  const db = getFirestore();
  const ref = db.collection(REGISTRATION_CONFIG_COLLECTION).doc(docId);
  const snap = await ref.get();
  if (!snap.exists) {
    return { docId, changed: false, action: "absent" };
  }
  const data = snap.data() ?? {};
  const current = parseConfig(data.config);
  const { config: next, changed } = ensureOpenEnrollmentInConfig(current);
  if (!changed) {
    return { docId, changed: false, action: "déjà présent" };
  }
  if (apply) {
    const now = new Date().toISOString();
    await ref.set(
      {
        config: next,
        updatedAt: now,
        updatedBy: "ensure-open-enrollment-slot",
      },
      { merge: true }
    );
    return { docId, changed: true, action: "appliqué" };
  }
  return { docId, changed: true, action: "à appliquer" };
}

async function main(): Promise<void> {
  const projectId = resolveProjectId();
  initFirebase(projectId);
  console.log(
    `[ensure-open-enrollment] project=${projectId} slot=${OPEN_ENROLLMENT_SLOT_ID} apply=${args.apply}`
  );

  for (const docId of [REGISTRATION_CONFIG_ACTIVE_ID, REGISTRATION_CONFIG_DRAFT_ID]) {
    const result = await ensureDoc(docId, args.apply);
    console.log(`  ${result.docId}: ${result.action}${result.changed ? " (changed)" : ""}`);
  }

  if (!args.apply) {
    console.log("Dry-run terminé. Relancer avec --apply pour écrire.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
