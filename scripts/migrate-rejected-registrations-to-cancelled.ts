#!/usr/bin/env tsx
/**
 * Migre les dossiers `status: rejected` (legacy) vers `cancelled`.
 *
 *   npx tsx scripts/migrate-rejected-registrations-to-cancelled.ts --project sqyping-teamup --use-adc
 *   npx tsx scripts/migrate-rejected-registrations-to-cancelled.ts --project sqyping-teamup --use-adc --apply
 */
import * as dotenv from "dotenv";
import * as path from "node:path";
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });
dotenv.config({ path: path.join(__dirname, "..", ".env") });

function readArgValue(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Valeur manquante pour ${flag}`);
  }
  return value;
}

async function main(): Promise<void> {
  const projectId =
    readArgValue("--project")?.trim() ||
    process.env.FB_PROJECT_ID?.trim() ||
    "sqyping-teamup";
  const apply = process.argv.includes("--apply");
  const useAdc = process.argv.includes("--use-adc");

  if (!getApps().length) {
    if (!useAdc) {
      throw new Error("Utilisez --use-adc.");
    }
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    initializeApp({ credential: applicationDefault(), projectId });
  }

  const db = getFirestore();
  const snap = await db.collection("clubRegistrations").where("status", "==", "rejected").get();
  console.log(`${snap.size} dossier(s) rejected trouvé(s).`);

  if (!apply || snap.empty) {
    return;
  }

  let batch = db.batch();
  let ops = 0;
  for (const doc of snap.docs) {
    batch.set(
      doc.ref,
      {
        status: "cancelled",
        cancellationReason:
          typeof doc.data().cancellationReason === "string"
            ? doc.data().cancellationReason
            : "Migration legacy : statut refusé → annulé",
        cancelledAt:
          typeof doc.data().cancelledAt === "string"
            ? doc.data().cancelledAt
            : new Date().toISOString(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    ops += 1;
    if (ops >= 400) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops > 0) {
    await batch.commit();
  }
  console.log(`Migré ${snap.size} dossier(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
