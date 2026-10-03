#!/usr/bin/env ts-node

/**
 * Répare en prod les constats d'audit paiement (points 2–5) :
 *  - paidAt / status paid avec reliquat
 *  - plans chèques « fantômes » (expected sur soldé)
 *  - déclaration CV ≠ encaissements CV sur soldé
 *  - sync paymentStatus racine via paymentToFirestoreUpdate
 *
 * Usage :
 *   npx tsx scripts/repair-payment-audit-findings.ts --project sqyping-teamup --use-adc
 *   npx tsx scripts/repair-payment-audit-findings.ts --project sqyping-teamup --use-adc --apply
 */
import * as dotenv from "dotenv";
import * as fs from "node:fs";
import * as path from "node:path";
import { initializeApp, applicationDefault, cert, getApps } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import {
  buildPaymentAuditRepairPlan,
  type PaymentAuditRepairKind,
} from "../src/lib/club-registration/repair-payment-audit-findings";
import { formatPersonDisplayName } from "../src/lib/shared/person-name-format";

const COLLECTION = "clubRegistrations";
const BATCH_SIZE = 400;

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

function inferServiceAccountProjectId(clientEmail: string): string | null {
  const match = clientEmail.match(/@([^.]+)\.iam\.gserviceaccount\.com$/);
  return match?.[1] ?? null;
}

function initFirebaseAdmin(projectId: string): void {
  if (getApps().length > 0) return;

  if (args.useAdc && args.credentialsPath) {
    throw new Error("Utilisez soit --use-adc soit --credentials, pas les deux.");
  }

  if (args.credentialsPath) {
    const credentialsPath = path.resolve(args.credentialsPath);
    if (!fs.existsSync(credentialsPath)) {
      throw new Error(`Fichier credentials introuvable : ${credentialsPath}`);
    }
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
    const parsed = JSON.parse(fs.readFileSync(credentialsPath, "utf8")) as {
      client_email?: string;
    };
    const credentialProjectId = parsed.client_email
      ? inferServiceAccountProjectId(parsed.client_email)
      : null;
    if (credentialProjectId && credentialProjectId !== projectId) {
      throw new Error(
        `Incohérence projet/credentials : cible=${projectId}, service account=${credentialProjectId}`
      );
    }
    initializeApp({
      credential: cert(credentialsPath),
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
  if (envCredentialsPath) {
    const resolvedPath = path.resolve(envCredentialsPath);
    initializeApp({
      credential: cert(resolvedPath),
      projectId,
    });
    return;
  }

  initializeApp({
    credential: applicationDefault(),
    projectId,
  });
}

function toAdminPatch(patch: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = { ...patch };
  if (Object.prototype.hasOwnProperty.call(next, "paidAt") && next.paidAt === null) {
    next.paidAt = FieldValue.delete();
  }
  next.updatedAt = FieldValue.serverTimestamp();
  next.paymentAuditRepairedAt = FieldValue.serverTimestamp();
  return next;
}

async function main(): Promise<void> {
  const projectId = resolveProjectId();
  initFirebaseAdmin(projectId);
  const db = getFirestore();

  console.log(
    `[repair-payment-audit] Projet=${projectId} mode=${dryRun ? "simulation" : "application"}`
  );

  const snapshot = await db.collection(COLLECTION).get();
  const affected: Array<{
    id: string;
    name: string;
    kinds: PaymentAuditRepairKind[];
    summary: string[];
    patch: Record<string, unknown>;
  }> = [];
  const kindCounts: Record<string, number> = {};

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data() as Record<string, unknown>;
    const plan = buildPaymentAuditRepairPlan(data);
    if (!plan) continue;

    const firstName = typeof data.firstName === "string" ? data.firstName : "";
    const lastName = typeof data.lastName === "string" ? data.lastName : "";
    const name = formatPersonDisplayName(firstName, lastName) || docSnap.id;

    affected.push({
      id: docSnap.id,
      name,
      kinds: plan.kinds,
      summary: plan.summary,
      patch: plan.patch,
    });
    for (const kind of plan.kinds) {
      kindCounts[kind] = (kindCounts[kind] ?? 0) + 1;
    }
  }

  console.log(`Dossiers analysés : ${snapshot.size}`);
  console.log(`Dossiers à corriger : ${affected.length}`);
  console.log("Répartition :");
  for (const [kind, count] of Object.entries(kindCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${count}\t${kind}`);
  }
  console.log("");

  for (const row of affected) {
    console.log(
      `- ${row.name} (${row.id}) | ${row.kinds.join("+")} | ${row.summary.join(" ; ")}`
    );
  }

  if (dryRun) {
    console.log(
      "\nSimulation terminée. Relancez avec --apply pour appliquer les corrections."
    );
    return;
  }

  let batch = db.batch();
  let batchCount = 0;
  let updated = 0;

  for (const row of affected) {
    const docRef = db.collection(COLLECTION).doc(row.id);
    const snap = await docRef.get();
    const data = snap.data() as Record<string, unknown> | undefined;
    if (!data) continue;
    const plan = buildPaymentAuditRepairPlan(data);
    if (!plan) continue;

    batch.update(docRef, toAdminPatch(plan.patch));
    batchCount += 1;
    updated += 1;

    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      console.log(`  batch commit ${batchCount}`);
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`\n[repair-payment-audit] Terminé : ${updated} dossier(s) corrigé(s).`);
}

main().catch((error) => {
  console.error(
    "[repair-payment-audit] Échec :",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});
