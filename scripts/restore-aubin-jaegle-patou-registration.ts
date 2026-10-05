#!/usr/bin/env tsx
/**
 * Reconstitue le dossier Aubin JAEGLE PATOU (FAC-2026-2027-00448) après suppression dure,
 * puis l'annule proprement (AVO de clôture) pour combler le trou de séquence.
 *
 * Dry-run (défaut) :
 *   npx tsx scripts/restore-aubin-jaegle-patou-registration.ts --project sqyping-teamup --use-adc
 *
 * Apply :
 *   npx tsx scripts/restore-aubin-jaegle-patou-registration.ts --project sqyping-teamup --use-adc --apply
 */
import * as dotenv from "dotenv";
import * as path from "node:path";
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { cancelClubRegistration } from "../src/lib/club-registration/cancel-registration";
import {
  ACCOUNTING_INVOICES_FIELD,
} from "../src/lib/club-registration/payment-documents/accounting-invoice-types";
import { createAccountingInvoiceId } from "../src/lib/club-registration/payment-documents/accounting-invoice-parse";
import { getRegistrationCancelConfirmationPhrase } from "../src/lib/club-registration/validate-registration-cancel-confirmation";

const REGISTRATION_ID = "x8VELUlBTWBxKJ5yIKvG";
const INVOICE_NUMBER = "FAC-2026-2027-00448";
const ACTOR_UID = "script:restore-aubin-jaegle-patou";

const IDENTITY = {
  firstName: "Aubin",
  lastName: "JAEGLE PATOU",
  ffttLicense: "7899939",
  adherentEmail: "clem.sido@gmail.com",
  addressLine1: "16 Rue Antoine Lemaistre",
  postalCode: "78114",
  city: "Magny-les-Hameaux",
};

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
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    "sqyping-teamup";
  const apply = process.argv.includes("--apply");
  const useAdc = process.argv.includes("--use-adc");

  if (!getApps().length) {
    if (!useAdc) {
      throw new Error("Utilisez --use-adc pour la production.");
    }
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    initializeApp({ credential: applicationDefault(), projectId });
  }

  const db = getFirestore();
  const ref = db.collection("clubRegistrations").doc(REGISTRATION_ID);
  const snap = await ref.get();

  if (snap.exists) {
    const status = snap.data()?.status;
    console.log(`Dossier ${REGISTRATION_ID} existe déjà (status=${String(status)}). Rien à faire.`);
    return;
  }

  const issuedAt = "2026-10-03T00:00:00.000Z";
  const invoiceDoc = {
    id: createAccountingInvoiceId(),
    kind: "invoice" as const,
    documentNumber: INVOICE_NUMBER,
    label: "Facture d'adhésion",
    lines: [
      { label: "Licence FFTT 2026-2027", amountCents: 4700 },
      { label: "Cotisation 2026-2027", amountCents: 16000 },
    ],
    totalCents: 20700,
    issuedAt,
    quoteTotalAfterCents: 20700,
  };

  const payload = {
    firstName: IDENTITY.firstName,
    lastName: IDENTITY.lastName,
    ffttLicense: IDENTITY.ffttLicense,
    adherentEmail: IDENTITY.adherentEmail,
    addressLine1: IDENTITY.addressLine1,
    postalCode: IDENTITY.postalCode,
    city: IDENTITY.city,
    status: "payment_requested",
    teamupInvoiceNumber: INVOICE_NUMBER,
    [ACCOUNTING_INVOICES_FIELD]: [invoiceDoc],
    paymentAmountCents: 20700,
    schemaVersion: 1,
    restoredAfterHardDeleteAt: new Date().toISOString(),
    restoredAfterHardDeleteBy: ACTOR_UID,
    updatedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  };

  console.log(
    apply
      ? `APPLY — reconstitution ${REGISTRATION_ID} + annulation`
      : `DRY-RUN — reconstitution prévue pour ${REGISTRATION_ID} (${INVOICE_NUMBER}, 207 €)`
  );

  if (!apply) {
    return;
  }

  await ref.set(payload, { merge: false });

  const cancelResult = await cancelClubRegistration({
    db,
    registrationId: REGISTRATION_ID,
    actorUid: ACTOR_UID,
    reason:
      "Reconstitution après suppression erronée ; annulation dossier (trou séquence FAC-448)",
    confirmationPhrase: getRegistrationCancelConfirmationPhrase({
      firstName: IDENTITY.firstName,
      lastName: IDENTITY.lastName,
    }),
  });

  if (!cancelResult.ok) {
    throw new Error(`Annulation impossible après reconstitution : ${cancelResult.error}`);
  }

  const after = await ref.get();
  const data = after.data() ?? {};
  console.log(
    JSON.stringify(
      {
        id: REGISTRATION_ID,
        status: data.status,
        cancellationReason: data.cancellationReason,
        teamupInvoiceNumber: data.teamupInvoiceNumber,
        accountingInvoices: data.accountingInvoices,
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
