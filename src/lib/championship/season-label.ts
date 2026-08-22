import type { Firestore } from "firebase-admin/firestore";

const CONFIG_COLLECTION = "clubRegistrationConfig";
const ACTIVE_CONFIG_ID = "active";

/**
 * Lit `meta.seasonLabel` publié. Utilisable depuis Cloud Functions (passe le `db` déjà ouvert).
 */
export async function readPublishedSeasonLabel(db: Firestore): Promise<string> {
  const snap = await db.collection(CONFIG_COLLECTION).doc(ACTIVE_CONFIG_ID).get();
  const config = snap.data()?.config as
    | { meta?: { seasonLabel?: unknown } }
    | undefined;
  const label = config?.meta?.seasonLabel;
  if (typeof label === "string" && label.trim()) {
    return label.trim();
  }
  throw new Error("Libellé de saison introuvable sur la config d'adhésion active");
}
