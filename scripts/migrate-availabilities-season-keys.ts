#!/usr/bin/env ts-node

/**
 * Migre `availabilities` vers des IDs préfixés par saison.
 *
 * - Docs déjà saisonnés (`2026-2027_…`) : ignorés.
 * - `aller_5_masculin` / `aller_5_feminin` : archive forcée vers `2025-2026_*`,
 *   clear `players` sur le doc legacy (sondage J5 déjà lancé = slate propre).
 * - Autres docs legacy : si sondage Discord associé créé ≥ début saison courante
 *   (ou `updatedAt` doc ≥ début saison) → `2026-2027_*`, sinon → `2025-2026_*`.
 * - Après copie vers la saison courante : merge des `players` (cible gagne si conflit),
 *   clear `players` sur le legacy.
 *
 * Usage :
 *   npx tsx scripts/migrate-availabilities-season-keys.ts
 *   npx tsx scripts/migrate-availabilities-season-keys.ts --project sqyping-teamup --use-adc --apply
 */
import * as dotenv from "dotenv";
import * as fs from "node:fs";
import * as path from "node:path";
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import {
  FieldValue,
  getFirestore,
  Timestamp,
  type Firestore,
} from "firebase-admin/firestore";
import {
  getAvailabilityDocumentId,
  getLegacyAvailabilityDocumentId,
  stripSeasonPrefixFromAvailabilityDocId,
} from "../src/lib/availability/document-id";
import { normalizePlayersMap } from "../src/lib/availability/normalize-players-map";
import {
  seasonLabelFromDate,
  seasonStartDate,
} from "../src/lib/championship/calendar-season-label";
import { parseAvailabilityPollId } from "../src/lib/discord/availability-poll-id";

const AVAIL_COLLECTION = "availabilities";
const POLL_COLLECTION = "discordAvailabilityPolls";

/** Journée 5 aller : forcer archive N-1 (réponses de l'an dernier). */
const FORCE_ARCHIVE_LEGACY_IDS = new Set([
  "aller_5_masculin",
  "aller_5_feminin",
]);

type ScriptArgs = {
  apply: boolean;
  projectId: string | null;
  useAdc: boolean;
  credentialsPath: string | null;
  currentSeason: string | null;
  previousSeason: string | null;
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
    currentSeason: readArgValue("--current-season"),
    previousSeason: readArgValue("--previous-season"),
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

function initFirebase(projectId: string): void {
  if (getApps().length > 0) {
    return;
  }

  if (args.credentialsPath) {
    const credentialsPath = path.resolve(args.credentialsPath);
    if (!fs.existsSync(credentialsPath)) {
      throw new Error(`Fichier credentials introuvable : ${credentialsPath}`);
    }
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
    initializeApp({ credential: applicationDefault(), projectId });
    return;
  }

  if (args.useAdc) {
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    initializeApp({ credential: applicationDefault(), projectId });
    return;
  }

  const envCredentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (!envCredentialsPath) {
    throw new Error(
      "Credentials Firebase non configurés.\n" +
        "Staging : .env.local (GOOGLE_APPLICATION_CREDENTIALS).\n" +
        "Production : --project sqyping-teamup --use-adc"
    );
  }

  initializeApp({
    credential: applicationDefault(),
    projectId,
  });
}

function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  return null;
}

function previousSeasonLabel(current: string): string {
  const start = Number.parseInt(current.split("-")[0] ?? "", 10);
  if (!Number.isFinite(start)) {
    throw new Error(`Saison courante invalide: ${current}`);
  }
  return `${start - 1}-${start}`;
}

function parseLegacyAvailabilityId(docId: string): {
  phase: "aller" | "retour";
  journee: number;
  championshipType: "masculin" | "feminin";
  idEpreuve?: number;
} | null {
  const parsed = parseAvailabilityPollId(docId);
  if (!parsed || parsed.seasonLabel) {
    return null;
  }
  return {
    phase: parsed.phase,
    journee: parsed.journee,
    championshipType: parsed.championshipType,
    ...(parsed.idEpreuve !== undefined ? { idEpreuve: parsed.idEpreuve } : {}),
  };
}

async function loadPollCreatedAtByLegacyId(
  db: Firestore
): Promise<Map<string, Date>> {
  const snap = await db.collection(POLL_COLLECTION).get();
  const map = new Map<string, Date>();
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const createdAt = toDate(data.createdAt);
    if (!createdAt) {
      continue;
    }
    const { legacyId } = stripSeasonPrefixFromAvailabilityDocId(docSnap.id);
    map.set(legacyId, createdAt);
    map.set(docSnap.id, createdAt);
  }
  return map;
}

async function copyAvailabilityDoc(params: {
  db: Firestore;
  sourceId: string;
  targetId: string;
  targetSeason: string;
  clearSourcePlayers: boolean;
  mergePlayers: boolean;
}): Promise<"copied" | "merged" | "skipped-exists" | "noop"> {
  const { db, sourceId, targetId, targetSeason, clearSourcePlayers, mergePlayers } =
    params;
  if (sourceId === targetId) {
    return "noop";
  }

  const sourceRef = db.collection(AVAIL_COLLECTION).doc(sourceId);
  const targetRef = db.collection(AVAIL_COLLECTION).doc(targetId);
  const [sourceSnap, targetSnap] = await Promise.all([
    sourceRef.get(),
    targetRef.get(),
  ]);

  if (!sourceSnap.exists) {
    return "noop";
  }

  const sourceData = sourceSnap.data() as Record<string, unknown>;
  const sourcePlayers = normalizePlayersMap(sourceData);

  if (targetSnap.exists && !mergePlayers) {
    console.log(`  skip target exists: ${targetId}`);
    if (clearSourcePlayers && !dryRun) {
      await sourceRef.update({
        players: {},
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    return "skipped-exists";
  }

  const targetPlayers = targetSnap.exists
    ? normalizePlayersMap(targetSnap.data() as Record<string, unknown>)
    : {};
  const mergedPlayers = mergePlayers
    ? { ...sourcePlayers, ...targetPlayers }
    : sourcePlayers;

  const payload: Record<string, unknown> = {
    journee: sourceData.journee,
    phase: sourceData.phase,
    championshipType: sourceData.championshipType,
    seasonLabel: targetSeason,
    players: mergedPlayers,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (sourceData.date !== undefined) {
    payload.date = sourceData.date;
  }
  if (sourceData.idEpreuve !== undefined) {
    payload.idEpreuve = sourceData.idEpreuve;
  }
  if (targetSnap.exists && targetSnap.data()?.createdAt) {
    payload.createdAt = targetSnap.data()?.createdAt;
  } else if (sourceData.createdAt) {
    payload.createdAt = sourceData.createdAt;
  } else {
    payload.createdAt = FieldValue.serverTimestamp();
  }

  console.log(
    `  ${dryRun ? "would write" : "write"} ${sourceId} → ${targetId} (players=${Object.keys(mergedPlayers).length})`
  );

  if (!dryRun) {
    await targetRef.set(payload, { merge: true });
    if (clearSourcePlayers) {
      await sourceRef.update({
        players: {},
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  return targetSnap.exists ? "merged" : "copied";
}

async function main(): Promise<void> {
  const projectId = resolveProjectId();
  initFirebase(projectId);
  const db = getFirestore();

  const currentSeason =
    args.currentSeason?.trim() || seasonLabelFromDate(new Date());
  const previousSeason =
    args.previousSeason?.trim() || previousSeasonLabel(currentSeason);
  const currentSeasonStart = seasonStartDate(currentSeason);

  console.log(
    `[migrate-availabilities] project=${projectId} mode=${dryRun ? "dry-run" : "APPLY"} current=${currentSeason} previous=${previousSeason}`
  );

  const pollCreatedAt = await loadPollCreatedAtByLegacyId(db);
  const snap = await db.collection(AVAIL_COLLECTION).get();

  let archived = 0;
  let migratedCurrent = 0;
  let skipped = 0;

  for (const docSnap of snap.docs) {
    const { seasonLabel } = stripSeasonPrefixFromAvailabilityDocId(docSnap.id);
    if (seasonLabel) {
      skipped += 1;
      continue;
    }

    const parsed = parseLegacyAvailabilityId(docSnap.id);
    if (!parsed) {
      console.log(`- skip unparseable: ${docSnap.id}`);
      skipped += 1;
      continue;
    }

    const forceArchive = FORCE_ARCHIVE_LEGACY_IDS.has(docSnap.id);
    const pollAt = pollCreatedAt.get(docSnap.id);
    const updatedAt = toDate(docSnap.data().updatedAt);
    const belongsToCurrent =
      !forceArchive &&
      ((pollAt !== undefined && pollAt >= currentSeasonStart) ||
        (updatedAt !== undefined &&
          updatedAt !== null &&
          updatedAt >= currentSeasonStart));

    const targetSeason = belongsToCurrent ? currentSeason : previousSeason;
    const targetId = getAvailabilityDocumentId(
      targetSeason,
      parsed.journee,
      parsed.phase,
      parsed.championshipType,
      parsed.idEpreuve
    );

    console.log(
      `- ${docSnap.id} → ${targetId} (${forceArchive ? "force-archive-j5" : belongsToCurrent ? "current-season" : "previous-season"})`
    );

    const result = await copyAvailabilityDoc({
      db,
      sourceId: docSnap.id,
      targetId,
      targetSeason,
      clearSourcePlayers: true,
      mergePlayers: belongsToCurrent,
    });

    if (result === "copied" || result === "merged") {
      if (belongsToCurrent) {
        migratedCurrent += 1;
      } else {
        archived += 1;
      }
    } else {
      skipped += 1;
    }

    // Garantir que le legacy ID connu existe toujours (pour debug) même vide
    if (
      forceArchive &&
      !dryRun &&
      result !== "noop"
    ) {
      const legacyId = getLegacyAvailabilityDocumentId(
        parsed.journee,
        parsed.phase,
        parsed.championshipType,
        parsed.idEpreuve
      );
      if (legacyId === docSnap.id) {
        // already cleared above
      }
    }
  }

  console.log(
    `[migrate-availabilities] done: scanned=${snap.size} archived=${archived} migratedCurrent=${migratedCurrent} skipped=${skipped}`
  );
  if (dryRun) {
    console.log("Relancer avec --apply pour écrire.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
