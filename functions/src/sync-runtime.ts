import * as functions from "firebase-functions";

/** Secrets FFTT (Secret Manager) — mêmes noms que sur App Hosting. */
export const FFTT_SYNC_SECRETS = ["ID_FFTT", "PWD_FFTT"] as const;

/**
 * Runtime partagé pour les synchros FFTT (cron + HTTP manuel).
 * timeout 9 min, 1 GiB — les synchros matchs peuvent être longues.
 */
export const ffttSyncFunctions = functions.runWith({
  timeoutSeconds: 540,
  memory: "1GB",
  secrets: [...FFTT_SYNC_SECRETS],
});
