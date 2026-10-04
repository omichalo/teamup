#!/usr/bin/env tsx
/**
 * Rattrapage des anomalies d'export Sage (lecture seule par défaut).
 *
 * Actions :
 *  1. Attribuer les REC manquants sur encaissements actifs
 *  2. Émettre les AVO manquants pour remises exceptionnelles
 *  3. Reclasser les moyens `other` → sumup / transfer d'après le libellé
 *
 * Usage :
 *   npx tsx scripts/repair-sage-export-anomalies.ts --project sqyping-teamup --use-adc
 *   npx tsx scripts/repair-sage-export-anomalies.ts --project sqyping-teamup --use-adc --apply
 */
import * as dotenv from "dotenv";
import * as fs from "node:fs";
import * as path from "node:path";
import { initializeApp, applicationDefault, cert, getApps } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { classifyOtherReceivedMethod } from "../src/lib/accounting-export/chart";
import { getRegistrationPaymentAids } from "../src/lib/club-registration/payment/aid-receipt";
import {
  isExceptionalDiscountAidType,
  sumExceptionalDiscountCents,
} from "../src/lib/club-registration/payment/exceptional-discount";
import {
  normalizeRegistrationPayment,
  paymentToFirestoreUpdate,
} from "../src/lib/club-registration/payment/normalize-payment";
import type { ReceivedPaymentMethodId } from "../src/lib/club-registration/payment-constants";
import { RECEIVED_PAYMENT_METHOD_LABELS } from "../src/lib/club-registration/payment-constants";
import {
  parseAccountingInvoices,
  sumAccountingInvoicesNetCents,
} from "../src/lib/club-registration/payment-documents/accounting-invoice-parse";
import { hasReceivedPaymentDocumentNumber, isActiveReceivedPayment } from "../src/lib/club-registration/payment-documents/received-payment-document-helpers";
import {
  resolveAccountingInvoiceTargetCents,
  syncAccountingDocumentsAfterRegistrationWrite,
} from "../src/lib/club-registration/payment-documents/sync-document-numbers";
import { formatPersonDisplayName } from "../src/lib/shared/person-name-format";

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

function initFirebaseAdmin(projectId: string): void {
  if (getApps().length > 0) return;
  if (args.credentialsPath) {
    const raw = JSON.parse(fs.readFileSync(path.resolve(args.credentialsPath), "utf8")) as {
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
  if (args.useAdc) {
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }
  initializeApp({ credential: applicationDefault(), projectId });
}

type PlannedAction = {
  registrationId: string;
  name: string;
  actions: string[];
};

async function main(): Promise<void> {
  const projectId = resolveProjectId();
  initFirebaseAdmin(projectId);
  const db = getFirestore();
  const snap = await db.collection(COLLECTION).get();

  const planned: PlannedAction[] = [];
  let missingReceipts = 0;
  let missingAvos = 0;
  let reclassifications = 0;
  let nonSettlementOthers = 0;

  for (const doc of snap.docs) {
    const data = (doc.data() ?? {}) as Record<string, unknown>;
    const name =
      formatPersonDisplayName(
        typeof data.firstName === "string" ? data.firstName : undefined,
        typeof data.lastName === "string" ? data.lastName : undefined
      ) || doc.id;
    const actions: string[] = [];
    const payment = normalizeRegistrationPayment(data);
    let nextPayment = payment;

    if (payment) {
      const missingActive = payment.receivedPayments.filter(
        (line) => isActiveReceivedPayment(line) && !hasReceivedPaymentDocumentNumber(line)
      );
      if (missingActive.length > 0) {
        missingReceipts += missingActive.length;
        actions.push(
          `Attribuer REC à ${missingActive.length} encaissement(s) actif(s) (${missingActive
            .map((line) => `${line.method}:${line.amountCents}`)
            .join(", ")})`
        );
      }

      let paymentDirty = false;
      const rewritten = payment.receivedPayments.map((line) => {
        if (line.method !== "other") return line;
        const classified = classifyOtherReceivedMethod({
          label: line.label,
          note: line.note,
        });
        if (classified === "non_settlement") {
          nonSettlementOthers += 1;
          actions.push(
            `Revue manuelle : encaissement other non financier « ${line.label || line.note || "—"} » ${line.amountCents} cts (REC ${line.documentNumber || "sans n°"})`
          );
          return line;
        }
        if (classified === "sumup" || classified === "transfer") {
          reclassifications += 1;
          paymentDirty = true;
          const method = classified as ReceivedPaymentMethodId;
          actions.push(
            `Reclasser ${line.documentNumber || line.id} other → ${method} (${line.label || "—"})`
          );
          return {
            ...line,
            method,
            label: line.label?.trim() || RECEIVED_PAYMENT_METHOD_LABELS[method],
          };
        }
        return line;
      });
      if (paymentDirty) {
        nextPayment = { ...payment, receivedPayments: rewritten };
      }
    }

    const discount = sumExceptionalDiscountCents(getRegistrationPaymentAids(data));
    const invoices = parseAccountingInvoices(data);
    if (discount > 0 && invoices.length > 0) {
      const target = resolveAccountingInvoiceTargetCents(data);
      const actual = sumAccountingInvoicesNetCents(invoices);
      if (actual > target) {
        missingAvos += 1;
        const note =
          getRegistrationPaymentAids(data).find(
            (aid) => isExceptionalDiscountAidType(aid.type) && aid.note?.trim()
          )?.note ?? "";
        actions.push(
          `Émettre AVO remise exceptionnelle ${actual - target} cts${note ? ` (${note})` : ""}`
        );
      }
    }

    if (actions.length === 0) {
      continue;
    }

    planned.push({ registrationId: doc.id, name, actions });

    if (!args.apply) {
      continue;
    }

    if (nextPayment && nextPayment !== payment) {
      await db
        .collection(COLLECTION)
        .doc(doc.id)
        .set(
          {
            ...paymentToFirestoreUpdate(nextPayment),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
    }

    await syncAccountingDocumentsAfterRegistrationWrite(db, doc.id, {
      reason: "Rattrapage anomalies export Sage",
    });
  }

  const outDir = path.join(__dirname, "..", "tmp", "sage-export");
  fs.mkdirSync(outDir, { recursive: true });
  const report = {
    projectId,
    apply: args.apply,
    generatedAt: new Date().toISOString(),
    counts: {
      dossiersTouches: planned.length,
      missingReceipts,
      missingAvos,
      reclassifications,
      nonSettlementOthers,
    },
    planned,
  };
  fs.writeFileSync(
    path.join(outDir, "repair-plan.json"),
    `${JSON.stringify(report, null, 2)}\n`
  );

  console.log(
    JSON.stringify(
      {
        projectId,
        apply: args.apply,
        ...report.counts,
        reportPath: path.join(outDir, "repair-plan.json"),
      },
      null,
      2
    )
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
