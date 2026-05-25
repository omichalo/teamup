import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { getDefaultRegistrationConfig } from "./default-config";
import { normalizeRegistrationConfigSortOrders } from "./normalize-sort-orders";
import { registrationConfigV1Schema } from "./schema";
import type { RegistrationConfigV1 } from "./types";

export const REGISTRATION_CONFIG_COLLECTION = "clubRegistrationConfig";
export const REGISTRATION_CONFIG_DRAFT_ID = "draft";
export const REGISTRATION_CONFIG_ACTIVE_ID = "active";

export type StoredRegistrationConfigDoc = {
  config: RegistrationConfigV1;
  updatedAt: string;
  updatedBy?: string | undefined;
  publishedAt?: string | undefined;
  publishedBy?: string | undefined;
};

function parseStoredConfig(data: unknown): RegistrationConfigV1 | null {
  if (typeof data !== "object" || data === null) return null;
  const record = data as Record<string, unknown>;
  const configCandidate = record.config ?? record;
  const parsed = registrationConfigV1Schema.safeParse(configCandidate);
  return parsed.success
    ? normalizeRegistrationConfigSortOrders(parsed.data as RegistrationConfigV1)
    : null;
}

export async function getRegistrationConfigDoc(
  docId: typeof REGISTRATION_CONFIG_DRAFT_ID | typeof REGISTRATION_CONFIG_ACTIVE_ID
): Promise<StoredRegistrationConfigDoc | null> {
  const db = getFirestoreAdmin();
  const snap = await db
    .collection(REGISTRATION_CONFIG_COLLECTION)
    .doc(docId)
    .get();

  if (!snap.exists) return null;

  const data = snap.data();
  const config = parseStoredConfig(data);
  if (!config) return null;

  return {
    config,
    updatedAt:
      typeof data?.updatedAt === "string"
        ? data.updatedAt
        : new Date().toISOString(),
    updatedBy: typeof data?.updatedBy === "string" ? data.updatedBy : undefined,
    publishedAt:
      typeof data?.publishedAt === "string" ? data.publishedAt : undefined,
    publishedBy:
      typeof data?.publishedBy === "string" ? data.publishedBy : undefined,
  };
}

export async function getActiveRegistrationConfig(): Promise<RegistrationConfigV1> {
  const doc = await getRegistrationConfigDoc(REGISTRATION_CONFIG_ACTIVE_ID);
  return doc?.config ?? getDefaultRegistrationConfig();
}

export async function getDraftRegistrationConfig(): Promise<RegistrationConfigV1> {
  const draft = await getRegistrationConfigDoc(REGISTRATION_CONFIG_DRAFT_ID);
  if (draft) return draft.config;
  const active = await getRegistrationConfigDoc(REGISTRATION_CONFIG_ACTIVE_ID);
  return active?.config ?? getDefaultRegistrationConfig();
}

export async function saveDraftRegistrationConfig(
  config: RegistrationConfigV1,
  updatedBy: string
): Promise<void> {
  const db = getFirestoreAdmin();
  await db
    .collection(REGISTRATION_CONFIG_COLLECTION)
    .doc(REGISTRATION_CONFIG_DRAFT_ID)
    .set(
      {
        config,
        updatedAt: new Date().toISOString(),
        updatedBy,
      },
      { merge: false }
    );
}

export async function publishRegistrationConfig(
  config: RegistrationConfigV1,
  publishedBy: string
): Promise<void> {
  const db = getFirestoreAdmin();
  const now = new Date().toISOString();
  const batch = db.batch();
  const activeRef = db
    .collection(REGISTRATION_CONFIG_COLLECTION)
    .doc(REGISTRATION_CONFIG_ACTIVE_ID);
  const draftRef = db
    .collection(REGISTRATION_CONFIG_COLLECTION)
    .doc(REGISTRATION_CONFIG_DRAFT_ID);

  batch.set(activeRef, {
    config,
    updatedAt: now,
    updatedBy: publishedBy,
    publishedAt: now,
    publishedBy,
  });
  batch.set(
    draftRef,
    {
      config,
      updatedAt: now,
      updatedBy: publishedBy,
    },
    { merge: true }
  );

  await batch.commit();
}

export async function ensureRegistrationConfigSeeded(): Promise<void> {
  const db = getFirestoreAdmin();
  const activeRef = db
    .collection(REGISTRATION_CONFIG_COLLECTION)
    .doc(REGISTRATION_CONFIG_ACTIVE_ID);
  const snap = await activeRef.get();
  if (snap.exists) return;

  const defaultConfig = getDefaultRegistrationConfig();
  const now = new Date().toISOString();
  const batch = db.batch();
  batch.set(activeRef, {
    config: defaultConfig,
    updatedAt: now,
    publishedAt: now,
    publishedBy: "system",
  });
  batch.set(db.collection(REGISTRATION_CONFIG_COLLECTION).doc(REGISTRATION_CONFIG_DRAFT_ID), {
    config: defaultConfig,
    updatedAt: now,
    updatedBy: "system",
  });
  await batch.commit();
}

export async function getRegistrationConfigByCatalogVersion(
  catalogVersion: string
): Promise<RegistrationConfigV1> {
  const active = await getActiveRegistrationConfig();
  if (active.meta.catalogVersion === catalogVersion) {
    return active;
  }
  const defaultConfig = getDefaultRegistrationConfig();
  if (defaultConfig.meta.catalogVersion === catalogVersion) {
    return defaultConfig;
  }
  return active;
}
