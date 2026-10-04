#!/usr/bin/env tsx
/**
 * Fige sageAuxiliaryCode sur les dossiers engagés (legacy C…/P…).
 *
 *   npx tsx scripts/backfill-sage-auxiliary-codes.ts --project sqyping-teamup --use-adc
 *   npx tsx scripts/backfill-sage-auxiliary-codes.ts --project sqyping-teamup --use-adc --apply
 */
import * as dotenv from "dotenv";
import * as fs from "node:fs";
import * as path from "node:path";
import { initializeApp, applicationDefault, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  deriveLegacySageAuxiliaryCode,
  persistLegacySageAuxiliaryCode,
  readPersistedSageAuxiliaryCode,
} from "../src/lib/club-registration/payment-documents/sage-auxiliary-code";
import { isInvoiceDocumentAvailable } from "../src/lib/club-registration/payment-documents/availability";

const COLLECTION = "clubRegistrations";

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
      credential: cert(JSON.parse(fs.readFileSync(credentialsPath, "utf8"))),
      projectId,
    });
    return;
  }
  initializeApp({ credential: applicationDefault(), projectId });
}

function needsAuxiliary(data: Record<string, unknown>): boolean {
  if (readPersistedSageAuxiliaryCode(data)) {
    return false;
  }
  if (
    typeof data.teamupInvoiceNumber === "string" &&
    data.teamupInvoiceNumber.trim()
  ) {
    return true;
  }
  return isInvoiceDocumentAvailable(data);
}

async function main(): Promise<void> {
  const projectId = resolveProjectId();
  initFirebase(projectId);
  const db = getFirestore();
  const snap = await db.collection(COLLECTION).get();

  const planned: Array<{
    registrationId: string;
    code: string;
    name: string;
  }> = [];

  for (const doc of snap.docs) {
    const data = (doc.data() ?? {}) as Record<string, unknown>;
    if (!needsAuxiliary(data)) {
      continue;
    }
    const code = deriveLegacySageAuxiliaryCode(data, doc.id);
    const firstName = typeof data.firstName === "string" ? data.firstName : "";
    const lastName = typeof data.lastName === "string" ? data.lastName : "";
    planned.push({
      registrationId: doc.id,
      code,
      name: `${firstName} ${lastName}`.trim() || doc.id,
    });
  }

  if (args.apply) {
    for (const row of planned) {
      const snapDoc = await db.collection(COLLECTION).doc(row.registrationId).get();
      const data = (snapDoc.data() ?? {}) as Record<string, unknown>;
      await persistLegacySageAuxiliaryCode({
        db,
        registrationId: row.registrationId,
        data,
        code: row.code,
      });
    }
  }

  const outDir = path.join(__dirname, "..", "tmp", "sage-export");
  fs.mkdirSync(outDir, { recursive: true });
  const reportPath = path.join(outDir, "backfill-sage-auxiliary-plan.json");
  fs.writeFileSync(
    reportPath,
    `${JSON.stringify(
      {
        projectId,
        apply: args.apply,
        generatedAt: new Date().toISOString(),
        count: planned.length,
        planned,
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  console.log(
    JSON.stringify(
      {
        projectId,
        apply: args.apply,
        count: planned.length,
        reportPath,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
