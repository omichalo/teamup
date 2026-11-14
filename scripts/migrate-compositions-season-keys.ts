#!/usr/bin/env ts-node

/**
 * Migre `compositions` vers des IDs préfixés par saison.
 *
 * - Docs déjà saisonnés (`2026-2027_…`) : ignorés.
 * - `aller_5_masculin` / `aller_5_feminin` : archive forcée vers `2025-2026_*`,
 *   clear `teams` sur le doc legacy (compos J5 N-1 encore présentes).
 * - Autres docs legacy : si `updatedAt` ≥ début saison courante → `2026-2027_*`,
 *   sinon → `2025-2026_*`.
 * - Après copie vers la saison courante : merge des `teams` (cible gagne si conflit
 *   sur une équipe), clear `teams` sur le legacy.
 *
 * Usage :
 *   npx tsx scripts/migrate-compositions-season-keys.ts
 *   npx tsx scripts/migrate-compositions-season-keys.ts --project sqyping-teamup --use-adc --apply
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
  getCompositionDocumentId,
  getLegacyCompositionDocumentId,
  parseLegacyCompositionDocumentId,
  stripSeasonPrefixFromCompositionDocId,
} from "../src/lib/compositions/document-id";
import {
  seasonLabelFromDate,
  seasonStartDate,
} from "../src/lib/championship/calendar-season-label";

const COMPOSITION_COLLECTION = "compositions";

/** Journée 5 aller : forcer archive N-1 (compos de l'an dernier). */
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

function normalizeTeamsMap(
  value: unknown
): Record<string, string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const result: Record<string, string[]> = {};
  for (const [teamId, players] of Object.entries(
    value as Record<string, unknown>
  )) {
    if (!Array.isArray(players)) {
      continue;
    }
    result[teamId] = players.filter(
      (playerId): playerId is string => typeof playerId === "string" && playerId.length > 0
    );
  }
  return result;
}

function mergeTeamsMaps(
  source: Record<string, string[]>,
  target: Record<string, string[]>
): Record<string, string[]> {
  return { ...source, ...target };
}

async function copyCompositionDoc(params: {
  db: Firestore;
  sourceId: string;
  targetId: string;
  targetSeason: string;
  clearSourceTeams: boolean;
  mergeTeams: boolean;
}): Promise<"copied" | "merged" | "noop"> {
  const { db, sourceId, targetId, targetSeason, clearSourceTeams, mergeTeams } =
    params;
  if (sourceId === targetId) {
    return "noop";
  }

  const sourceRef = db.collection(COMPOSITION_COLLECTION).doc(sourceId);
  const targetRef = db.collection(COMPOSITION_COLLECTION).doc(targetId);
  const [sourceSnap, targetSnap] = await Promise.all([
    sourceRef.get(),
    targetRef.get(),
  ]);

  if (!sourceSnap.exists) {
    return "noop";
  }

  const sourceData = sourceSnap.data() ?? {};
  const sourceTeams = normalizeTeamsMap(sourceData.teams);
  const targetTeams = targetSnap.exists
    ? normalizeTeamsMap(targetSnap.data()?.teams)
    : {};
  const mergedTeams = mergeTeams
    ? mergeTeamsMaps(sourceTeams, targetTeams)
    : sourceTeams;

  const payload: Record<string, unknown> = {
    journee: sourceData.journee,
    phase: sourceData.phase,
    championshipType: sourceData.championshipType,
    seasonLabel: targetSeason,
    teams: mergedTeams,
    updatedAt: FieldValue.serverTimestamp(),
  };
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
    `  ${dryRun ? "would write" : "write"} ${sourceId} → ${targetId} (teams=${Object.keys(mergedTeams).length}, slots=${Object.values(mergedTeams).reduce((n, a) => n + a.length, 0)})`
  );

  if (!dryRun) {
    await targetRef.set(payload, { merge: true });
    if (clearSourceTeams) {
      await sourceRef.update({
        teams: {},
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
    `[migrate-compositions] project=${projectId} mode=${dryRun ? "dry-run" : "APPLY"} current=${currentSeason} previous=${previousSeason}`
  );

  const snap = await db.collection(COMPOSITION_COLLECTION).get();

  let archived = 0;
  let migratedCurrent = 0;
  let skipped = 0;

  for (const docSnap of snap.docs) {
    const { seasonLabel } = stripSeasonPrefixFromCompositionDocId(docSnap.id);
    if (seasonLabel) {
      skipped += 1;
      continue;
    }

    const parsed = parseLegacyCompositionDocumentId(docSnap.id);
    if (!parsed) {
      console.log(`- skip unparseable: ${docSnap.id}`);
      skipped += 1;
      continue;
    }

    const forceArchive = FORCE_ARCHIVE_LEGACY_IDS.has(docSnap.id);
    const updatedAt = toDate(docSnap.data().updatedAt);
    const belongsToCurrent =
      !forceArchive &&
      updatedAt !== undefined &&
      updatedAt !== null &&
      updatedAt >= currentSeasonStart;

    const targetSeason = belongsToCurrent ? currentSeason : previousSeason;
    const targetId = getCompositionDocumentId(
      targetSeason,
      parsed.journee,
      parsed.phase,
      parsed.championshipType,
      parsed.idEpreuve
    );

    console.log(
      `- ${docSnap.id} → ${targetId} (${forceArchive ? "force-archive-j5" : belongsToCurrent ? "current-season" : "previous-season"})`
    );

    const result = await copyCompositionDoc({
      db,
      sourceId: docSnap.id,
      targetId,
      targetSeason,
      clearSourceTeams: true,
      mergeTeams: belongsToCurrent,
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

    if (forceArchive && !dryRun) {
      const legacyId = getLegacyCompositionDocumentId(
        parsed.journee,
        parsed.phase,
        parsed.championshipType,
        parsed.idEpreuve
      );
      if (legacyId !== docSnap.id) {
        // no-op: legacy id already matches source
      }
    }
  }

  console.log(
    `[migrate-compositions] done: scanned=${snap.size} archived=${archived} migratedCurrent=${migratedCurrent} skipped=${skipped}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
