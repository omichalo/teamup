#!/usr/bin/env ts-node

/**
 * Aligne paymentStatus (et l'objet payment imbriqué) sur les dossiers déjà réglés
 * (paidAt ou status === "paid") mais encore en paymentStatus legacy "pending", etc.
 *
 * Usage :
 *   # Staging (défaut via .env.local)
 *   npx tsx scripts/repair-registration-payment-status.ts
 *
 *   # Production — compte Google (ADC), ignore les credentials .env.local
 *   npx tsx scripts/repair-registration-payment-status.ts --project sqyping-teamup --use-adc
 *
 *   # Production — fichier service account dédié
 *   npx tsx scripts/repair-registration-payment-status.ts \
 *     --project sqyping-teamup \
 *     --credentials ~/secrets/sqyping-teamup-adminsdk.json
 *
 *   # Appliquer les corrections
 *   ... --apply
 */
import * as dotenv from "dotenv";
import * as fs from "node:fs";
import * as path from "node:path";
import { initializeApp, applicationDefault, cert, getApps } from "firebase-admin/app";
import { FieldValue, getFirestore, type DocumentData } from "firebase-admin/firestore";
import {
  normalizeRegistrationPayment,
  paymentToFirestoreUpdate,
} from "../src/lib/club-registration/payment/normalize-payment";
import { markPaymentFullyPaid } from "../src/lib/club-registration/payment/payment-mutations";
import { needsRegistrationPaymentStatusRepair } from "../src/lib/club-registration/repair-registration-payment-status";
import { resolveRegistrationPaymentStatus } from "../src/lib/club-registration/resolve-registration-payment-status";
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

function inferServiceAccountProjectId(clientEmail: string): string | null {
  const match = clientEmail.match(/@([^.]+)\.iam\.gserviceaccount\.com$/);
  return match?.[1] ?? null;
}

type AuthMode = "adc" | "service-account-file" | "env-cert";

function initFirebaseAdmin(projectId: string): AuthMode {
  if (getApps().length > 0) {
    return "adc";
  }

  if (args.useAdc && args.credentialsPath) {
    throw new Error("Utilisez soit --use-adc soit --credentials, pas les deux.");
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
    console.log(`[repair-payment-status] Auth=service-account-file (${credentialsPath})`);
    return "service-account-file";
  }

  if (args.useAdc) {
    // .env.local définit souvent GOOGLE_APPLICATION_CREDENTIALS (staging) : ADC sinon
    // continuerait d'utiliser ce fichier au lieu du compte gcloud.
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    initializeApp({
      credential: applicationDefault(),
      projectId,
    });
    console.log("[repair-payment-status] Auth=adc (gcloud application-default login)");
    return "adc";
  }

  const envCredentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  const privateKey = process.env.FB_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FB_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;

  if (envCredentialsPath) {
    const resolvedPath = path.resolve(envCredentialsPath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`GOOGLE_APPLICATION_CREDENTIALS introuvable : ${resolvedPath}`);
    }
    initializeApp({
      credential: applicationDefault(),
      projectId,
    });
    const credentialProjectId = inferServiceAccountProjectId(
      JSON.parse(fs.readFileSync(resolvedPath, "utf8")).client_email as string
    );
    if (credentialProjectId && credentialProjectId !== projectId) {
      throw new Error(
        `Incohérence projet/credentials : cible=${projectId}, service account=${credentialProjectId} (${resolvedPath}).\n` +
          `Relancez avec --project ${credentialProjectId} ou --credentials <fichier-prod.json> ou --use-adc.`
      );
    }
    console.log(`[repair-payment-status] Auth=service-account-file (${resolvedPath})`);
    return "service-account-file";
  }

  if (!privateKey || !clientEmail) {
    throw new Error(
      "Credentials Firebase non configurés.\n" +
        "Staging : .env.local (GOOGLE_APPLICATION_CREDENTIALS ou FB_*).\n" +
        "Production : --project sqyping-teamup --use-adc (après gcloud auth application-default login)\n" +
        "           ou --project sqyping-teamup --credentials <adminsdk-prod.json>"
    );
  }

  const credentialProjectId = inferServiceAccountProjectId(clientEmail);
  if (credentialProjectId && credentialProjectId !== projectId) {
    throw new Error(
      `Incohérence projet/credentials : cible=${projectId}, FB_CLIENT_EMAIL=${credentialProjectId}.\n` +
        `Relancez avec --project ${credentialProjectId} ou --use-adc / --credentials pour la prod.`
    );
  }

  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  });
  console.log(`[repair-payment-status] Auth=env-cert (${clientEmail})`);
  return "env-cert";
}

function formatPaidAt(value: unknown): string {
  if (value && typeof value === "object" && "toDate" in value) {
    const toDate = (value as { toDate?: () => Date }).toDate;
    if (typeof toDate === "function") {
      return toDate.call(value).toISOString();
    }
  }
  if (typeof value === "string") {
    return value;
  }
  return "—";
}

function buildRepairPatch(data: DocumentData): Record<string, unknown> {
  const payment = normalizeRegistrationPayment(data);
  const nextPayment = payment
    ? markPaymentFullyPaid(payment, { recordedBy: "repair-script" })
    : null;

  return {
    status: "paid",
    ...(nextPayment ? paymentToFirestoreUpdate(nextPayment) : { paymentStatus: "paid" }),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

async function commitBatch(
  batch: FirebaseFirestore.WriteBatch,
  pending: number
): Promise<void> {
  if (pending === 0 || dryRun) {
    return;
  }
  await batch.commit();
}

function printPermissionDeniedHelp(projectId: string, authMode: AuthMode): void {
  console.error(
    [
      "",
      `Accès Firestore refusé sur le projet « ${projectId} » (auth=${authMode}).`,
      "",
      "Vérifications :",
      `  1. Le compte / service account a un rôle Firestore sur ${projectId} (ex. Cloud Datastore User ou Firebase Admin).`,
      "  2. Vous ne mélangez pas projet prod et credentials staging (.env.local = sqyping-teamup-dev).",
      "",
      "Commandes utiles :",
      "  gcloud auth application-default login",
      `  gcloud config set project ${projectId}`,
      `  npx tsx scripts/repair-registration-payment-status.ts --project ${projectId} --use-adc`,
      "",
      "Ou avec un JSON adminsdk prod :",
      `  npx tsx scripts/repair-registration-payment-status.ts --project ${projectId} --credentials <fichier.json>`,
      "",
    ].join("\n")
  );
}

async function main(): Promise<void> {
  const projectId = resolveProjectId();
  const authMode = initFirebaseAdmin(projectId);
  const db = getFirestore();

  console.log(
    `[repair-payment-status] Projet=${projectId} mode=${dryRun ? "simulation (--apply absent)" : "application"}`
  );

  let snapshot;
  try {
    snapshot = await db.collection(COLLECTION).get();
  } catch (error) {
    const code = (error as { code?: number }).code;
    const message = error instanceof Error ? error.message : String(error);
    if (code === 7 || message.includes("PERMISSION_DENIED")) {
      printPermissionDeniedHelp(projectId, authMode);
    }
    throw error;
  }

  const affected: Array<{
    id: string;
    name: string;
    status: string;
    paymentStatus: string;
    paidAt: string;
    resolvedDisplay: string;
  }> = [];

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (!needsRegistrationPaymentStatusRepair(data)) {
      continue;
    }

    const firstName = typeof data.firstName === "string" ? data.firstName : "";
    const lastName = typeof data.lastName === "string" ? data.lastName : "";
    const name = formatPersonDisplayName(firstName, lastName) || docSnap.id;
    const resolved = resolveRegistrationPaymentStatus(data) ?? "inconnu";

    affected.push({
      id: docSnap.id,
      name,
      status: typeof data.status === "string" ? data.status : "—",
      paymentStatus: typeof data.paymentStatus === "string" ? data.paymentStatus : "—",
      paidAt: formatPaidAt(data.paidAt),
      resolvedDisplay: resolved,
    });
  }

  console.log(`\nDossiers analysés : ${snapshot.size}`);
  console.log(`Dossiers à corriger : ${affected.length}\n`);

  if (affected.length === 0) {
    console.log("Aucun dossier incohérent trouvé.");
    return;
  }

  for (const row of affected) {
    console.log(
      `- ${row.name} (${row.id}) | status=${row.status} | paymentStatus=${row.paymentStatus} | paidAt=${row.paidAt}`
    );
  }

  if (dryRun) {
    console.log(
      "\nSimulation terminée. Relancez avec --apply pour écrire paymentStatus=paid sur ces dossiers."
    );
    return;
  }

  let batch = db.batch();
  let batchCount = 0;
  let updated = 0;

  for (const row of affected) {
    const docRef = db.collection(COLLECTION).doc(row.id);
    const snap = await docRef.get();
    const data = snap.data();
    if (!data || !needsRegistrationPaymentStatusRepair(data)) {
      continue;
    }

    const patch = buildRepairPatch(data);
    batch.update(docRef, patch);
    batchCount += 1;
    updated += 1;

    if (batchCount >= BATCH_SIZE) {
      await commitBatch(batch, batchCount);
      batch = db.batch();
      batchCount = 0;
    }
  }

  await commitBatch(batch, batchCount);
  console.log(`\n[repair-payment-status] Terminé : ${updated} dossier(s) corrigé(s).`);
}

main().catch((error) => {
  console.error("[repair-payment-status] Échec :", error instanceof Error ? error.message : error);
  process.exit(1);
});
