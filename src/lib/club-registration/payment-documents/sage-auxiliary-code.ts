import type { Firestore, Transaction } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { FFTT_LICENSE_RE } from "@/lib/fftt/license-number";
import { digitsLicense } from "@/lib/championship/person-key";

export const SAGE_AUXILIARY_FIELD = "sageAuxiliaryCode";
export const SAGE_AUXILIARY_PREFIX = "A";
export const SAGE_AUXILIARY_SEQ_WIDTH = 6;

const REGISTRATIONS_COLLECTION = "clubRegistrations";
const COUNTERS_COLLECTION = "clubSageAuxiliaryCounters";
const COUNTER_DOC_ID = "global";
const CODES_COLLECTION = "clubSageAuxiliaryCodes";
const LICENSE_INDEX_COLLECTION = "clubSageAuxiliaryLicenseIndex";

const NEW_CODE_RE = /^A\d{6}$/;
const LEGACY_C_RE = /^C\d{4,12}$/;
const LEGACY_P_RE = /^P[A-Z0-9]{1,12}$/;

export function readFfttLicenseDigitsFromRegistration(
  data: Record<string, unknown>
): string {
  const direct = digitsLicense(data.ffttLicense);
  if (FFTT_LICENSE_RE.test(direct)) {
    return direct;
  }
  const lookup = data.ffttLicenseLookup;
  if (lookup && typeof lookup === "object") {
    const nested = digitsLicense((lookup as { licence?: unknown }).licence);
    if (FFTT_LICENSE_RE.test(nested)) {
      return nested;
    }
  }
  return "";
}

export function formatAllocatedSageAuxiliaryCode(sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error("Séquence auxiliaire Sage invalide");
  }
  return `${SAGE_AUXILIARY_PREFIX}${String(sequence).padStart(SAGE_AUXILIARY_SEQ_WIDTH, "0")}`;
}

export function isValidSageAuxiliaryCode(code: string): boolean {
  const trimmed = code.trim().toUpperCase();
  return NEW_CODE_RE.test(trimmed) || LEGACY_C_RE.test(trimmed) || LEGACY_P_RE.test(trimmed);
}

export function readPersistedSageAuxiliaryCode(
  data: Record<string, unknown>
): string | null {
  const raw = data[SAGE_AUXILIARY_FIELD];
  if (typeof raw !== "string" || !raw.trim()) {
    return null;
  }
  const code = raw.trim().toUpperCase();
  return isValidSageAuxiliaryCode(code) ? code : null;
}

/** Ancien schéma export : C+licence ou P+slug dossier (pour backfill / repli). */
export function deriveLegacySageAuxiliaryCode(
  data: Record<string, unknown>,
  registrationId: string
): string {
  const license = readFfttLicenseDigitsFromRegistration(data);
  if (license) {
    return `C${license}`;
  }
  const slug = registrationId.replace(/[^A-Za-z0-9]/g, "").slice(0, 12).toUpperCase();
  return `P${slug}`;
}

function licenseIndexRef(db: Firestore, licenseDigits: string) {
  return db.collection(LICENSE_INDEX_COLLECTION).doc(licenseDigits);
}

function codeRegistryRef(db: Firestore, code: string) {
  return db.collection(CODES_COLLECTION).doc(code);
}

function counterRef(db: Firestore) {
  return db.collection(COUNTERS_COLLECTION).doc(COUNTER_DOC_ID);
}

function writeLicenseIndexIfFree(params: {
  tx: Transaction;
  db: Firestore;
  code: string;
  licenseDigits: string;
  existingIndexCode: string;
}): void {
  if (params.existingIndexCode && params.existingIndexCode !== params.code) {
    return;
  }
  params.tx.set(
    licenseIndexRef(params.db, params.licenseDigits),
    {
      code: params.code,
      licenseDigits: params.licenseDigits,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  params.tx.set(
    codeRegistryRef(params.db, params.code),
    {
      code: params.code,
      licenseDigits: params.licenseDigits,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Garantit un `sageAuxiliaryCode` figé sur le dossier (idempotent).
 * Réutilise le code déjà lié à la licence si connu, sinon alloue `A######`.
 */
export async function ensureSageAuxiliaryCode(params: {
  db: Firestore;
  registrationId: string;
  data: Record<string, unknown>;
  /**
   * true = première FAC venant d'être attribuée → allouer A… (sauf réutilisation licence).
   * false/omit = dossier déjà engagé → figer le legacy C…/P… si pas encore de code.
   */
  preferNewAllocation?: boolean;
}): Promise<string> {
  const registrationRef = params.db
    .collection(REGISTRATIONS_COLLECTION)
    .doc(params.registrationId);

  return params.db.runTransaction(async (tx) => {
    const registrationSnap = await tx.get(registrationRef);
    const registrationData = (registrationSnap.data() ?? {}) as Record<string, unknown>;
    const already = readPersistedSageAuxiliaryCode(registrationData);
    const licenseDigits = readFfttLicenseDigitsFromRegistration({
      ...params.data,
      ...registrationData,
    });

    let indexCode = "";
    if (licenseDigits) {
      const indexSnap = await tx.get(licenseIndexRef(params.db, licenseDigits));
      indexCode =
        typeof indexSnap.data()?.code === "string"
          ? String(indexSnap.data()?.code).trim().toUpperCase()
          : "";
    }

    const existingInvoice =
      typeof registrationData.teamupInvoiceNumber === "string" &&
      registrationData.teamupInvoiceNumber.trim()
        ? registrationData.teamupInvoiceNumber.trim()
        : typeof params.data.teamupInvoiceNumber === "string" &&
            params.data.teamupInvoiceNumber.trim()
          ? params.data.teamupInvoiceNumber.trim()
          : "";

    /** Dossier déjà engagé sans code : figer le legacy C…/P… (pas une nouvelle séquence A). */
    const freezeLegacy = Boolean(existingInvoice) && !params.preferNewAllocation;

    const counterSnap =
      already || (indexCode && isValidSageAuxiliaryCode(indexCode)) || freezeLegacy
        ? null
        : await tx.get(counterRef(params.db));

    if (already) {
      if (licenseDigits) {
        writeLicenseIndexIfFree({
          tx,
          db: params.db,
          code: already,
          licenseDigits,
          existingIndexCode: indexCode,
        });
      }
      return already;
    }

    if (indexCode && isValidSageAuxiliaryCode(indexCode)) {
      tx.set(
        registrationRef,
        {
          [SAGE_AUXILIARY_FIELD]: indexCode,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      if (licenseDigits) {
        writeLicenseIndexIfFree({
          tx,
          db: params.db,
          code: indexCode,
          licenseDigits,
          existingIndexCode: indexCode,
        });
      }
      return indexCode;
    }

    const code = freezeLegacy
      ? deriveLegacySageAuxiliaryCode(
          { ...params.data, ...registrationData },
          params.registrationId
        )
      : formatAllocatedSageAuxiliaryCode(
          (typeof counterSnap?.data()?.nextSeq === "number"
            ? (counterSnap.data()?.nextSeq as number)
            : 0) + 1
        );

    if (!freezeLegacy) {
      const current =
        typeof counterSnap?.data()?.nextSeq === "number"
          ? (counterSnap.data()?.nextSeq as number)
          : 0;
      tx.set(
        counterRef(params.db),
        {
          nextSeq: current + 1,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    tx.set(
      codeRegistryRef(params.db, code),
      {
        code,
        licenseDigits: licenseDigits || null,
        source: freezeLegacy ? "legacy_freeze" : "allocated",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        primaryRegistrationId: params.registrationId,
      },
      { merge: true }
    );
    if (licenseDigits) {
      tx.set(
        licenseIndexRef(params.db, licenseDigits),
        {
          code,
          licenseDigits,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
    tx.set(
      registrationRef,
      {
        [SAGE_AUXILIARY_FIELD]: code,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return code;
  });
}

/**
 * Backfill : fige le code legacy (C…/P…) sans allouer de nouvelle séquence A.
 */
export async function persistLegacySageAuxiliaryCode(params: {
  db: Firestore;
  registrationId: string;
  data: Record<string, unknown>;
  code: string;
}): Promise<string> {
  const code = params.code.trim().toUpperCase();
  if (!isValidSageAuxiliaryCode(code)) {
    throw new Error(`Code auxiliaire legacy invalide: ${params.code}`);
  }

  const registrationRef = params.db
    .collection(REGISTRATIONS_COLLECTION)
    .doc(params.registrationId);
  const licenseDigits = readFfttLicenseDigitsFromRegistration(params.data);

  await params.db.runTransaction(async (tx) => {
    const registrationSnap = await tx.get(registrationRef);
    const registrationData = (registrationSnap.data() ?? {}) as Record<string, unknown>;
    const already = readPersistedSageAuxiliaryCode(registrationData);
    let existingIndexCode = "";
    if (licenseDigits) {
      const indexSnap = await tx.get(licenseIndexRef(params.db, licenseDigits));
      existingIndexCode =
        typeof indexSnap.data()?.code === "string"
          ? String(indexSnap.data()?.code).trim().toUpperCase()
          : "";
    }
    if (already) {
      return;
    }

    tx.set(
      registrationRef,
      {
        [SAGE_AUXILIARY_FIELD]: code,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    tx.set(
      codeRegistryRef(params.db, code),
      {
        code,
        licenseDigits: licenseDigits || null,
        source: "backfill",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        primaryRegistrationId: params.registrationId,
      },
      { merge: true }
    );
    if (licenseDigits && (!existingIndexCode || existingIndexCode === code)) {
      tx.set(
        licenseIndexRef(params.db, licenseDigits),
        {
          code,
          licenseDigits,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
  });

  return code;
}
