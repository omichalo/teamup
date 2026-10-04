import * as fs from "node:fs";
import * as path from "node:path";
import type { Firestore } from "firebase-admin/firestore";
import { buildSageExportForRegistration } from "./build-sage-entries";
import { sageLinesToXImportTxt } from "./format-ximport";
import {
  anomaliesToCsv,
  sageLinesToDetailCsv,
  sageLinesToImportCsv,
  summarizeSageLines,
  thirdPartiesToCsv,
  type SageExportSummary,
} from "./serialize";
import type { SageEntryLine, SageExportAnomaly, SageThirdParty } from "./types";
import { createDeflatedZip } from "./zip-store";

const COLLECTION = "clubRegistrations";

export type SageExportControl = {
  projectId: string;
  seasonLabel: string | null;
  generatedAt: string;
  registrationsRead: number;
  registrationsWithEntries: number;
  summary: SageExportSummary;
  anomalyCounts: Record<string, number>;
  thirdPartyCount: number;
  provisionalThirdPartyCount: number;
  conflictingThirdPartyCodes: string[];
};

export type SageExportPack = {
  control: SageExportControl;
  fileName: string;
  zipBuffer: Buffer;
};

function resolveRegistrationSeasonLabel(data: Record<string, unknown>): string {
  if (typeof data.seasonLabel === "string" && data.seasonLabel.trim()) {
    return data.seasonLabel.trim();
  }
  if (typeof data.season === "string" && data.season.trim()) {
    return data.season.trim();
  }
  return "";
}

function matchesSeasonFilter(
  data: Record<string, unknown>,
  seasonLabel: string | null
): boolean {
  if (!seasonLabel) {
    return true;
  }
  return resolveRegistrationSeasonLabel(data) === seasonLabel;
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

function seasonSlug(seasonLabel: string | null): string {
  if (!seasonLabel) {
    return "toutes-saisons";
  }
  return seasonLabel.trim().replace(/\s+/g, "-");
}

function buildReadme(control: SageExportControl): string {
  return [
    "Export comptable TeamUp → Sage (lecture seule).",
    `Projet : ${control.projectId}`,
    control.seasonLabel ? `Saison : ${control.seasonLabel}` : "Saison : toutes",
    `Généré le : ${control.generatedAt}`,
    "",
    "XIMPORT.TXT                 format Sage 50 / Ciel (largeur fixe) — import natif",
    "ecritures-sage.csv          CSV TeamUp (8 colonnes) — import paramétrable",
    "ecritures-sage-detail.csv   mêmes écritures + n° TeamUp, dossier, saison, nom",
    "tiers.csv                   comptes auxiliaires 411",
    "anomalies.csv               points à traiter avant ou après import",
    "controle.json               totaux, sans liste nominative",
    "export-comptable-sage.pdf   guide secrétariat (si présent dans le ZIP)",
    "",
    "Choisissez UN des deux formats d'écritures pour l'import (pas les deux) :",
    "  - XIMPORT.TXT : plus direct dans Sage 50 Simply (Échanges → Importer)",
    "  - ecritures-sage.csv : plus lisible, nécessite un import paramétrable",
    "",
    "Chaque ZIP est un journal complet de la saison : ne pas réimporter dans Sage",
    "sans avoir extourné l'import précédent.",
    "",
    "Rapprochez le plan de comptes proposé du dossier Sage du club avant le",
    "premier import. Faites un essai sur une copie du dossier.",
    "",
  ].join("\n");
}

function tryReadSpecPdf(): Buffer | null {
  const candidates = [
    path.join(process.cwd(), "public", "docs", "export-comptable-sage.pdf"),
    path.join(process.cwd(), "docs", "technical", "export-comptable-sage.pdf"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return fs.readFileSync(candidate);
    }
  }
  return null;
}

/**
 * Construit le pack ZIP d'export Sage à partir des dossiers Firestore.
 */
export async function buildSageExportPack(params: {
  db: Firestore;
  projectId: string;
  seasonLabel?: string | null;
}): Promise<SageExportPack> {
  const seasonLabel =
    typeof params.seasonLabel === "string" && params.seasonLabel.trim()
      ? params.seasonLabel.trim()
      : null;

  const snap = await params.db.collection(COLLECTION).get();
  const lines: SageEntryLine[] = [];
  const anomalies: SageExportAnomaly[] = [];
  const parties: SageThirdParty[] = [];
  let registrationsRead = 0;
  let exportedRegistrations = 0;

  for (const doc of snap.docs) {
    const data = (doc.data() ?? {}) as Record<string, unknown>;
    if (!matchesSeasonFilter(data, seasonLabel)) {
      continue;
    }
    registrationsRead += 1;
    const exported = buildSageExportForRegistration(doc.id, data);
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

  const control: SageExportControl = {
    projectId: params.projectId,
    seasonLabel,
    generatedAt: new Date().toISOString(),
    registrationsRead,
    registrationsWithEntries: exportedRegistrations,
    summary,
    anomalyCounts,
    thirdPartyCount: thirdParties.rows.length,
    provisionalThirdPartyCount: thirdParties.rows.filter((party) => party.provisional)
      .length,
    conflictingThirdPartyCodes: thirdParties.conflictingCodes,
  };

  const zipFiles = [
    {
      name: "XIMPORT.TXT",
      data: Buffer.from(sageLinesToXImportTxt(lines), "latin1"),
    },
    {
      name: "ecritures-sage.csv",
      data: Buffer.from(sageLinesToImportCsv(lines), "utf8"),
    },
    {
      name: "ecritures-sage-detail.csv",
      data: Buffer.from(sageLinesToDetailCsv(lines), "utf8"),
    },
    {
      name: "tiers.csv",
      data: Buffer.from(thirdPartiesToCsv(thirdParties.rows), "utf8"),
    },
    {
      name: "anomalies.csv",
      data: Buffer.from(anomaliesToCsv(anomalies), "utf8"),
    },
    {
      name: "controle.json",
      data: Buffer.from(`${JSON.stringify(control, null, 2)}\n`, "utf8"),
    },
    {
      name: "LISEZMOI.txt",
      data: Buffer.from(buildReadme(control), "utf8"),
    },
  ];
  const specPdf = tryReadSpecPdf();
  if (specPdf) {
    zipFiles.push({ name: "export-comptable-sage.pdf", data: Buffer.from(specPdf) });
  }

  const zipBuffer = createDeflatedZip(zipFiles);

  return {
    control,
    fileName: `export-sage-${seasonSlug(seasonLabel)}.zip`,
    zipBuffer,
  };
}
