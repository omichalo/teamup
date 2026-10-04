#!/usr/bin/env tsx
/**
 * Export comptable Sage en lecture seule.
 *
 * Production :
 *   npx tsx scripts/export-sage-entries.ts --project sqyping-teamup --use-adc
 *
 * Les CSV contiennent des données adhérents. Ils sont écrits dans tmp/ (gitignoré).
 */
import * as dotenv from "dotenv";
import * as fs from "node:fs";
import * as path from "node:path";
import { initializeApp, applicationDefault, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  anomaliesToCsv,
  buildSageExportForRegistration,
  sageLinesToDetailCsv,
  sageLinesToImportCsv,
  sageLinesToXImportTxt,
  summarizeSageLines,
  thirdPartiesToCsv,
} from "../src/lib/accounting-export";
import type { SageEntryLine, SageExportAnomaly, SageThirdParty } from "../src/lib/accounting-export";

const COLLECTION = "clubRegistrations";

type ScriptArgs = {
  projectId: string | null;
  useAdc: boolean;
  credentialsPath: string | null;
  outDir: string;
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
    projectId: readArgValue("--project"),
    useAdc: process.argv.includes("--use-adc"),
    credentialsPath: readArgValue("--credentials"),
    outDir: readArgValue("--out") ?? path.join(__dirname, "..", "tmp", "sage-export"),
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
    const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, "utf8")) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };
    if (!serviceAccount.client_email || !serviceAccount.private_key) {
      throw new Error("Fichier credentials incomplet.");
    }
    initializeApp({
      credential: cert({
        projectId: serviceAccount.project_id ?? projectId,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key,
      }),
      projectId,
    });
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
      "Credentials absents. Production : --project sqyping-teamup --use-adc"
    );
  }
  const resolvedPath = path.resolve(envCredentialsPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`GOOGLE_APPLICATION_CREDENTIALS introuvable : ${resolvedPath}`);
  }
  initializeApp({ credential: applicationDefault(), projectId });
}

function dedupeThirdParties(parties: SageThirdParty[]): {
  rows: SageThirdParty[];
  conflictingCodes: string[];
} {
  const byCode = new Map<string, SageThirdParty>();
  const conflictingCodes = new Set<string>();
  for (const party of parties) {
    const current = byCode.get(party.code);
    if (!current) {
      byCode.set(party.code, party);
      continue;
    }
    const samePerson =
      current.lastName.localeCompare(party.lastName, "fr") === 0 &&
      current.firstName.localeCompare(party.firstName, "fr") === 0;
    if (!samePerson) {
      conflictingCodes.add(party.code);
    }
    if (party.seasonLabel.localeCompare(current.seasonLabel) > 0) {
      byCode.set(party.code, party);
    }
  }
  return {
    rows: [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code)),
    conflictingCodes: [...conflictingCodes].sort(),
  };
}

async function main(): Promise<void> {
  const projectId = resolveProjectId();
  if (projectId !== "sqyping-teamup" && !process.argv.includes("--allow-non-prod")) {
    throw new Error(
      `Projet cible « ${projectId} ». Ajoutez --project sqyping-teamup pour la production, ou --allow-non-prod.`
    );
  }
  initFirebaseAdmin(projectId);
  const db = getFirestore();
  const snap = await db.collection(COLLECTION).get();

  const lines: SageEntryLine[] = [];
  const anomalies: SageExportAnomaly[] = [];
  const parties: SageThirdParty[] = [];
  let exportedRegistrations = 0;

  for (const doc of snap.docs) {
    const exported = buildSageExportForRegistration(doc.id, doc.data());
    if (exported.lines.length === 0 && exported.anomalies.length === 0) {
      continue;
    }
    if (exported.lines.length > 0) {
      exportedRegistrations += 1;
    }
    lines.push(...exported.lines);
    anomalies.push(...exported.anomalies);
    if (exported.thirdParty) {
      parties.push(exported.thirdParty);
    }
  }

  const summary = summarizeSageLines(lines);
  const thirdParties = dedupeThirdParties(parties);
  const anomalyCounts: Record<string, number> = {};
  for (const anomaly of anomalies) {
    anomalyCounts[anomaly.code] = (anomalyCounts[anomaly.code] ?? 0) + 1;
  }

  fs.mkdirSync(args.outDir, { recursive: true });
  fs.writeFileSync(
    path.join(args.outDir, "XIMPORT.TXT"),
    sageLinesToXImportTxt(lines),
    "latin1"
  );
  fs.writeFileSync(path.join(args.outDir, "ecritures-sage.csv"), sageLinesToImportCsv(lines), "utf8");
  fs.writeFileSync(
    path.join(args.outDir, "ecritures-sage-detail.csv"),
    sageLinesToDetailCsv(lines),
    "utf8"
  );
  fs.writeFileSync(path.join(args.outDir, "anomalies.csv"), anomaliesToCsv(anomalies), "utf8");
  fs.writeFileSync(
    path.join(args.outDir, "tiers.csv"),
    thirdPartiesToCsv(thirdParties.rows),
    "utf8"
  );
  const control = {
    projectId,
    generatedAt: new Date().toISOString(),
    registrationsRead: snap.size,
    registrationsWithEntries: exportedRegistrations,
    summary,
    anomalyCounts,
    thirdPartyCount: thirdParties.rows.length,
    provisionalThirdPartyCount: thirdParties.rows.filter((party) => party.provisional).length,
    conflictingThirdPartyCodes: thirdParties.conflictingCodes,
  };
  fs.writeFileSync(
    path.join(args.outDir, "controle.json"),
    `${JSON.stringify(control, null, 2)}\n`,
    "utf8"
  );
  fs.writeFileSync(
    path.join(args.outDir, "LISEZMOI.txt"),
    [
      "Export comptable TeamUp → Sage (lecture seule).",
      `Projet : ${projectId}`,
      "",
      "XIMPORT.TXT                 format Sage 50 / Ciel (largeur fixe)",
      "ecritures-sage.csv          CSV TeamUp (8 colonnes, UTF-8, séparateur ;)",
      "ecritures-sage-detail.csv   mêmes écritures + n° TeamUp, dossier, saison, nom",
      "tiers.csv                   comptes auxiliaires 411",
      "anomalies.csv               points à traiter avant ou après import",
      "controle.json               totaux, sans liste nominative",
      "",
      "Importez XIMPORT.TXT OU ecritures-sage.csv, pas les deux.",
      "Chaque export est un journal complet de la saison : ne pas réimporter dans Sage",
      "sans avoir extourné l'import précédent.",
      "",
      "Rapprochez le plan de comptes du dossier Sage du club avant le premier import.",
      "Guide : docs/technical/export-comptable-sage.pdf (page Adhésions → Export comptable).",
      "",
    ].join("\n"),
    "utf8"
  );

  console.log(
    JSON.stringify(
      {
        projectId,
        outDir: args.outDir,
        registrationsRead: snap.size,
        registrationsWithEntries: exportedRegistrations,
        lineCount: summary.lineCount,
        pieceCount: summary.pieceCount,
        debitCents: summary.debitCents,
        creditCents: summary.creditCents,
        balanced: summary.balanced,
        anomalyCounts,
        thirdPartyCount: thirdParties.rows.length,
        provisionalThirdPartyCount: control.provisionalThirdPartyCount,
        conflictingThirdPartyCodes: thirdParties.conflictingCodes.length,
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
