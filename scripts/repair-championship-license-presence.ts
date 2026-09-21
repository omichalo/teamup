#!/usr/bin/env ts-node

/**
 * Répare les fiches effectif championnat avec `licensePresence: "unknown"` :
 * - recalcule depuis le miroir FFTT
 * - supprime les stubs orphelins (pas d'intent, pas coach, pas match)
 *
 * Usage :
 *   npx tsx scripts/repair-championship-license-presence.ts --project sqyping-teamup --use-adc
 *   npx tsx scripts/repair-championship-license-presence.ts --project sqyping-teamup --use-adc --apply
 */
import * as dotenv from "dotenv";
import * as fs from "node:fs";
import * as path from "node:path";
import { initializeApp, applicationDefault, cert, getApps } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { effectiveLicensePresence } from "../src/lib/championship/effective-license-presence";
import { isOrphanChampionshipRosterStub } from "../src/lib/championship/orphan-roster-stub";
import { championshipPlayersCollectionPath } from "../src/lib/championship/paths";
import type {
  ChampionshipPlayerRecord,
  LicensePresence,
} from "../src/lib/championship/records";
import {
  getPlayerFfttMirror,
  type PlayerFfttMirror,
} from "../src/lib/players/fftt-mirror";

type ScriptArgs = {
  apply: boolean;
  projectId: string | null;
  useAdc: boolean;
  credentialsPath: string | null;
  seasonLabel: string | null;
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
    seasonLabel: readArgValue("--season"),
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

function initFirebaseAdmin(projectId: string): void {
  if (getApps().length > 0) {
    return;
  }

  if (args.useAdc && args.credentialsPath) {
    throw new Error("Utilisez soit --use-adc soit --credentials, pas les deux.");
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
  const privateKey = process.env.FB_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FB_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;

  if (envCredentialsPath) {
    initializeApp({ credential: applicationDefault(), projectId });
    return;
  }

  if (!privateKey || !clientEmail) {
    throw new Error(
      "Credentials Firebase non configurés. Prod : --project sqyping-teamup --use-adc"
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

async function resolveSeasonLabel(
  db: FirebaseFirestore.Firestore
): Promise<string> {
  if (args.seasonLabel?.trim()) {
    return args.seasonLabel.trim();
  }
  const active = await db.collection("clubRegistrationConfig").doc("active").get();
  const fromActive = active.data()?.meta?.seasonLabel;
  if (typeof fromActive === "string" && fromActive.trim()) {
    return fromActive.trim();
  }
  const seasons = await db.collection("seasons").listDocuments();
  if (seasons.length === 1) {
    return seasons[0].id;
  }
  throw new Error(
    "Impossible de déterminer la saison. Passez --season 2026-2027"
  );
}

type RepairAction =
  | { kind: "delete"; personKey: string; name: string }
  | {
      kind: "update";
      personKey: string;
      name: string;
      from: LicensePresence;
      to: LicensePresence;
      fillNames: boolean;
    };

async function main(): Promise<void> {
  const projectId = resolveProjectId();
  initFirebaseAdmin(projectId);
  const db = getFirestore();
  const seasonLabel = await resolveSeasonLabel(db);

  console.log(
    `[repair-championship-license-presence] Projet=${projectId} saison=${seasonLabel} mode=${
      dryRun ? "simulation" : "application"
    }`
  );

  const snap = await db
    .collection(championshipPlayersCollectionPath(seasonLabel))
    .get();

  const actions: RepairAction[] = [];
  const mirrorCache = new Map<string, PlayerFfttMirror | null>();

  for (const doc of snap.docs) {
    const record = {
      personKey: doc.id,
      ...(doc.data() as ChampionshipPlayerRecord),
    };
    const license = (record.ffttLicense || doc.id || "").replace(/\D/g, "");

    if (isOrphanChampionshipRosterStub(record)) {
      let name = `${record.firstName} ${record.lastName}`.trim();
      if (!name && license) {
        if (!mirrorCache.has(license)) {
          mirrorCache.set(license, await getPlayerFfttMirror(db, license));
        }
        const mirror = mirrorCache.get(license);
        name = `${mirror?.prenom ?? ""} ${mirror?.nom ?? ""}`.trim() || license;
      }
      actions.push({
        kind: "delete",
        personKey: doc.id,
        name: name || doc.id,
      });
      continue;
    }

    if (record.licensePresence !== "unknown" && record.licensePresence) {
      continue;
    }

    if (!mirrorCache.has(license)) {
      mirrorCache.set(license, license ? await getPlayerFfttMirror(db, license) : null);
    }
    const mirror = mirrorCache.get(license) ?? null;
    const next = effectiveLicensePresence(record.licensePresence, {
      ffttLicense: license || null,
      listedInClub: mirror ? mirror.listedInClub : null,
      typeLicence: mirror?.typeLicence ?? null,
      licenseValidationStatus: record.licenseValidationStatus,
      playerNomClub: mirror?.nomClub ?? null,
    });

    const fillNames =
      (!(record.firstName ?? "").trim() || !(record.lastName ?? "").trim()) &&
      Boolean(mirror?.prenom || mirror?.nom);

    if (next === record.licensePresence && !fillNames) {
      continue;
    }

    actions.push({
      kind: "update",
      personKey: doc.id,
      name:
        `${record.firstName} ${record.lastName}`.trim() ||
        `${mirror?.prenom ?? ""} ${mirror?.nom ?? ""}`.trim() ||
        doc.id,
      from: record.licensePresence ?? "unknown",
      to: next,
      fillNames,
    });
  }

  const deletes = actions.filter((a) => a.kind === "delete");
  const updates = actions.filter((a) => a.kind === "update");

  console.log(`Stubs orphelins à supprimer : ${deletes.length}`);
  for (const action of deletes) {
    console.log(`  DELETE ${action.personKey} ${action.name}`);
  }
  console.log(`licensePresence à recalculer : ${updates.length}`);
  for (const action of updates) {
    if (action.kind !== "update") continue;
    console.log(
      `  UPDATE ${action.personKey} ${action.name} ${action.from} → ${action.to}${
        action.fillNames ? " (+noms)" : ""
      }`
    );
  }

  if (dryRun) {
    console.log("Simulation terminée. Relancez avec --apply pour écrire.");
    return;
  }

  let batch = db.batch();
  let pending = 0;
  const flush = async () => {
    if (pending === 0) return;
    await batch.commit();
    batch = db.batch();
    pending = 0;
  };

  for (const action of actions) {
    const ref = db
      .collection(championshipPlayersCollectionPath(seasonLabel))
      .doc(action.personKey);
    if (action.kind === "delete") {
      batch.delete(ref);
      pending += 1;
    } else {
      const license = action.personKey.replace(/\D/g, "");
      const mirror = mirrorCache.get(license);
      const patch: Record<string, unknown> = {
        licensePresence: action.to,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (action.fillNames && mirror) {
        if (mirror.prenom) patch.firstName = mirror.prenom;
        if (mirror.nom) patch.lastName = mirror.nom;
      }
      batch.set(ref, patch, { merge: true });
      pending += 1;
    }
    if (pending >= 400) {
      await flush();
    }
  }
  await flush();
  console.log(
    `Appliqué : ${deletes.length} suppressions, ${updates.length} mises à jour.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
