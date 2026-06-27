#!/usr/bin/env ts-node

/**
 * Renseigne priority + priorityRank sur les retours existants (tri Firestore).
 *
 * Usage :
 *   # Staging (depuis .env.local)
 *   TS_NODE_TRANSPILE_ONLY=1 npx ts-node scripts/backfill-suggestion-priority-rank.ts
 *
 *   # Production
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID=sqyping-teamup TS_NODE_TRANSPILE_ONLY=1 npx ts-node scripts/backfill-suggestion-priority-rank.ts
 *
 *   # Simulation
 *   ... --dry-run
 */
import { initializeApp, applicationDefault, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const COLLECTION = "appSuggestions";
const BATCH_SIZE = 400;
const PRIORITIES = ["low", "medium", "high"] as const;
type SuggestionPriority = (typeof PRIORITIES)[number];

const PRIORITY_RANK: Record<SuggestionPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const {
  GOOGLE_APPLICATION_CREDENTIALS,
  FIREBASE_PRIVATE_KEY,
  FIREBASE_CLIENT_EMAIL,
  FB_CLIENT_EMAIL,
  FB_PRIVATE_KEY,
  FB_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID,
} = process.env;

const dryRun = process.argv.includes("--dry-run");

function resolveProjectId(): string {
  return (
    FB_PROJECT_ID?.trim() ||
    NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    "sqyping-teamup-dev"
  );
}

function initFirebaseAdmin(projectId: string): void {
  if (getApps().length > 0) {
    return;
  }

  const privateKey = FB_PRIVATE_KEY || FIREBASE_PRIVATE_KEY;
  const clientEmail = FB_CLIENT_EMAIL || FIREBASE_CLIENT_EMAIL;

  if (GOOGLE_APPLICATION_CREDENTIALS || (!privateKey && !clientEmail)) {
    initializeApp({
      credential: applicationDefault(),
      projectId,
    });
    return;
  }

  if (!privateKey || !clientEmail) {
    throw new Error(
      "Credentials Firebase non configurés. Fournissez GOOGLE_APPLICATION_CREDENTIALS ou FIREBASE_PRIVATE_KEY/FIREBASE_CLIENT_EMAIL."
    );
  }

  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  });
}

function resolveStoredPriority(value: unknown): SuggestionPriority {
  if (
    typeof value === "string" &&
    (PRIORITIES as readonly string[]).includes(value)
  ) {
    return value as SuggestionPriority;
  }
  return "medium";
}

function buildPriorityFields(priority: SuggestionPriority): {
  priority: SuggestionPriority;
  priorityRank: number;
} {
  return {
    priority,
    priorityRank: PRIORITY_RANK[priority],
  };
}

function needsPriorityBackfill(
  priority: unknown,
  priorityRank: unknown
): { priority: SuggestionPriority; priorityRank: number } | null {
  const resolvedPriority = resolveStoredPriority(priority);
  const expectedRank = PRIORITY_RANK[resolvedPriority];
  const currentRank =
    typeof priorityRank === "number" && Number.isFinite(priorityRank)
      ? priorityRank
      : null;

  if (priority === resolvedPriority && currentRank === expectedRank) {
    return null;
  }

  return buildPriorityFields(resolvedPriority);
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

async function main(): Promise<void> {
  const projectId = resolveProjectId();
  initFirebaseAdmin(projectId);
  const db = getFirestore();

  console.log(
    `[backfill-priority-rank] Projet=${projectId} dryRun=${dryRun ? "oui" : "non"}`
  );

  const snapshot = await db.collection(COLLECTION).get();
  let updated = 0;
  let skipped = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const docSnap of snapshot.docs) {
    const patch = needsPriorityBackfill(
      docSnap.get("priority"),
      docSnap.get("priorityRank")
    );

    if (!patch) {
      skipped += 1;
      continue;
    }

    console.log(
      `[backfill] ${docSnap.id} -> priority=${patch.priority}, priorityRank=${patch.priorityRank}`
    );

    if (!dryRun) {
      batch.update(docSnap.ref, patch);
      batchCount += 1;

      if (batchCount >= BATCH_SIZE) {
        await commitBatch(batch, batchCount);
        batch = db.batch();
        batchCount = 0;
      }
    }

    updated += 1;
  }

  await commitBatch(batch, batchCount);

  console.log(
    `[backfill-priority-rank] Terminé : ${updated} mis à jour, ${skipped} déjà OK, ${snapshot.size} retour(s) au total.`
  );
}

main().catch((error) => {
  console.error("[backfill-priority-rank] Échec :", error);
  process.exit(1);
});
