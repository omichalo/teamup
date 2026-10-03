#!/usr/bin/env ts-node

/**
 * Attribue FAC / REC / AID + snapshots facture aux dossiers éligibles (ADR-0013/0014).
 *
 * Usage :
 *   # Simulation (défaut)
 *   npx tsx scripts/backfill-payment-document-numbers.ts
 *
 *   # Appliquer
 *   npx tsx scripts/backfill-payment-document-numbers.ts --apply
 *
 *   # Projet explicite
 *   npx tsx scripts/backfill-payment-document-numbers.ts --project sqyping-teamup --use-adc --apply
 */
import * as dotenv from "dotenv";
import * as fs from "node:fs";
import * as path from "node:path";
import { initializeApp, applicationDefault, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  isInvoiceDocumentAvailable,
  isReceiptDocumentAvailable,
} from "../src/lib/club-registration/payment-documents/availability";
import { parseAccountingInvoices } from "../src/lib/club-registration/payment-documents/accounting-invoice-parse";
import {
  hasAidDocumentNumber,
  isReceivedCollectableAid,
} from "../src/lib/club-registration/payment-documents/aid-document-helpers";
import { syncAccountingDocumentsAfterRegistrationWrite } from "../src/lib/club-registration/payment-documents/sync-document-numbers";
import { getRegistrationPaymentAids } from "../src/lib/club-registration/payment/aid-receipt";
import { normalizeRegistrationPayment } from "../src/lib/club-registration/payment/normalize-payment";
import { formatPersonDisplayName } from "../src/lib/shared/person-name-format";

const COLLECTION = "clubRegistrations";

type ScriptArgs = {
  apply: boolean;
  projectId: string | null;
  useAdc: boolean;
  credentialsPath: string | null;
};

function parseArgs(argv: string[]): ScriptArgs {
  const apply = argv.includes("--apply");
  const useAdc = argv.includes("--use-adc");
  let projectId: string | null = null;
  let credentialsPath: string | null = null;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--project" && argv[i + 1]) {
      projectId = argv[i + 1]!;
      i += 1;
    } else if (arg === "--credentials" && argv[i + 1]) {
      credentialsPath = argv[i + 1]!;
      i += 1;
    }
  }

  return { apply, projectId, useAdc, credentialsPath };
}

function resolveProjectId(explicit: string | null): string {
  return (
    explicit?.trim() ||
    process.env.FB_PROJECT_ID?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    "sqyping-teamup-dev"
  );
}

function initFirebaseAdmin(args: ScriptArgs, projectId: string): void {
  if (getApps().length > 0) {
    return;
  }

  if (args.credentialsPath) {
    const resolved = path.resolve(args.credentialsPath);
    const raw = JSON.parse(fs.readFileSync(resolved, "utf8")) as {
      project_id?: string;
      client_email: string;
      private_key: string;
    };
    initializeApp({
      credential: cert({
        projectId: raw.project_id || projectId,
        clientEmail: raw.client_email,
        privateKey: raw.private_key,
      }),
      projectId,
    });
    return;
  }

  if (args.useAdc || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    initializeApp({
      credential: applicationDefault(),
      projectId,
    });
    return;
  }

  const privateKey = process.env.FB_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FB_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;

  if (!privateKey || !clientEmail) {
    initializeApp({
      credential: applicationDefault(),
      projectId,
    });
    return;
  }

  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  });
}

function needsBackfill(data: Record<string, unknown>): {
  needInvoice: boolean;
  needReceipts: number;
  needSnapshot: boolean;
  needAids: number;
} {
  const hasInvoice =
    typeof data.teamupInvoiceNumber === "string" &&
    data.teamupInvoiceNumber.trim().length > 0;

  const payment = normalizeRegistrationPayment(data);
  const missingReceipts =
    payment?.receivedPayments.filter(
      (line) =>
        !line.reversedAt &&
        line.amountCents > 0 &&
        !(typeof line.documentNumber === "string" && line.documentNumber.trim())
    ).length ?? 0;

  const missingAids = getRegistrationPaymentAids(data).filter(
    (aid) => isReceivedCollectableAid(aid) && !hasAidDocumentNumber(aid)
  ).length;

  const needSnapshot =
    hasInvoice &&
    isInvoiceDocumentAvailable(data) &&
    parseAccountingInvoices(data).length === 0;

  return {
    needInvoice: isInvoiceDocumentAvailable(data) && !hasInvoice,
    needReceipts: isReceiptDocumentAvailable(data) ? missingReceipts : 0,
    needSnapshot,
    needAids: missingAids,
  };
}

async function main(): Promise<void> {
  dotenv.config({ path: ".env.local" });
  const args = parseArgs(process.argv.slice(2));
  const projectId = resolveProjectId(args.projectId);
  initFirebaseAdmin(args, projectId);
  const db = getFirestore();

  console.log(
    `[backfill-payment-document-numbers] Projet=${projectId} apply=${args.apply ? "oui" : "non (dry-run)"}`
  );

  const snapshot = await db.collection(COLLECTION).get();
  let candidates = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const docSnap of snapshot.docs) {
    const data = (docSnap.data() ?? {}) as Record<string, unknown>;
    const needs = needsBackfill(data);
    if (
      !needs.needInvoice &&
      needs.needReceipts === 0 &&
      !needs.needSnapshot &&
      needs.needAids === 0
    ) {
      skipped += 1;
      continue;
    }

    candidates += 1;
    const name =
      formatPersonDisplayName(
        typeof data.firstName === "string" ? data.firstName : undefined,
        typeof data.lastName === "string" ? data.lastName : undefined
      ) || docSnap.id;

    console.log(
      `[candidate] ${docSnap.id} (${name}) invoice=${needs.needInvoice} receipts=${needs.needReceipts} snapshot=${needs.needSnapshot} aids=${needs.needAids}`
    );

    if (!args.apply) {
      continue;
    }

    try {
      await syncAccountingDocumentsAfterRegistrationWrite(db, docSnap.id, {
        reason: "Backfill pièces comptables",
      });
      updated += 1;
      console.log(`  -> sync ok`);
    } catch (error) {
      errors += 1;
      console.error(`  ! erreur ${docSnap.id}`, error);
    }
  }

  console.log(
    `[done] candidates=${candidates} updated=${updated} skipped=${skipped} errors=${errors}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
