#!/usr/bin/env node
/**
 * Complète l'artefact Next.js standalone pour App Hosting / Docker.
 *
 * En mode `output: "standalone"`, Next.js ne trace que les fichiers `public/`
 * référencés au build (ex. logo). Les PDF et autres assets statiques non
 * importés doivent être recopiés explicitement — cf. doc Next.js standalone.
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
];

for (const { from, to, label } of copies) {
  if (!existsSync(from)) {
    throw new Error(`[prepare-standalone] Source introuvable: ${from}`);
  }
  cpSync(from, to, { recursive: true });
  console.log(`[prepare-standalone] Copié ${label} → ${to.replace(REPO_ROOT, ".")}`);
}

const requiredPublicAssets = [
  "club-registration/questionnaire-medical-majeur.pdf",
  "club-registration/questionnaire-medical-mineur.pdf",
  "club-registration/reglement-interieur-sqy-ping-2019.pdf",
];

for (const asset of requiredPublicAssets) {
  const target = join(STANDALONE_DIR, "public", asset);
  if (!existsSync(target)) {
    throw new Error(`[prepare-standalone] Asset manquant après copie: ${asset}`);
  }
}

console.log("[prepare-standalone] Artefact standalone prêt.");
