#!/usr/bin/env node
/**
 * Complète l'artefact Next.js standalone pour App Hosting / Docker.
 *
 * En mode `output: "standalone"`, Next.js ne trace que les fichiers `public/`
 * référencés au build (ex. logo). Les PDF et autres assets statiques non
 * importés doivent être recopiés explicitement — cf. doc Next.js standalone.
 *
 * PDFKit charge aussi ses AFM / standard-fonts au runtime (Helvetica par défaut)
 * même si on n’utilise que des TTF custom : sans ces fichiers, les routes
 * facture/reçu plantent en App Hosting.
 */

import { cpSync, existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const REPO_ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const STANDALONE_DIR = join(REPO_ROOT, ".next", "standalone");

if (!existsSync(STANDALONE_DIR)) {
  console.log("[prepare-standalone] Pas de dossier standalone — skip.");
  process.exit(0);
}

const copies = [
  {
    from: join(REPO_ROOT, "public"),
    to: join(STANDALONE_DIR, "public"),
    label: "public/",
  },
  {
    from: join(REPO_ROOT, ".next", "static"),
    to: join(STANDALONE_DIR, ".next", "static"),
    label: ".next/static/",
  },
  {
    from: join(REPO_ROOT, "node_modules", "pdfkit", "js", "data"),
    to: join(STANDALONE_DIR, "node_modules", "pdfkit", "js", "data"),
    label: "pdfkit/js/data/",
  },
  {
    from: join(REPO_ROOT, "node_modules", "pdfkit", "js", "standard-fonts"),
    to: join(STANDALONE_DIR, "node_modules", "pdfkit", "js", "standard-fonts"),
    label: "pdfkit/js/standard-fonts/",
  },
];

for (const { from, to, label } of copies) {
  if (!existsSync(from)) {
    throw new Error(`[prepare-standalone] Source introuvable: ${from}`);
  }
  cpSync(from, to, { recursive: true });
  console.log(`[prepare-standalone] Copié ${label} → ${to.replace(REPO_ROOT, ".")}`);
}

const requiredAssets = [
  "public/club-registration/questionnaire-medical-majeur.pdf",
  "public/club-registration/questionnaire-medical-mineur.pdf",
  "public/club-registration/reglement-interieur-sqy-ping-2019.pdf",
  "public/fonts/payment-receipt/NotoSans-Regular.ttf",
  "public/fonts/payment-receipt/NotoSans-Bold.ttf",
  "node_modules/pdfkit/js/standard-fonts/Helvetica.cjs",
  "node_modules/pdfkit/js/data/Helvetica.afm",
];

for (const asset of requiredAssets) {
  const target = join(STANDALONE_DIR, asset);
  if (!existsSync(target)) {
    throw new Error(`[prepare-standalone] Asset manquant après copie: ${asset}`);
  }
}

console.log("[prepare-standalone] Artefact standalone prêt.");
