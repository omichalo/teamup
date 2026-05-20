#!/usr/bin/env node
/**
 * Vérifie les plafonds de lignes sur l’ensemble des fichiers TypeScript sous src/.
 * Politique universelle : pas de filtre « nouveau vs main ».
 *
 * Fichiers déjà hors plafond : scripts/legacy-oversized-files.json
 * (plafond figé par fichier — interdiction de grossir ; retirer l’entrée après découpage).
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import { fileURLToPath } from "url";
import { resolvePolicy } from "./file-size-policy.mjs";

const REPO_ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SRC_ROOT = join(REPO_ROOT, "src");
const LEGACY_MANIFEST_PATH = join(
  REPO_ROOT,
  "scripts",
  "legacy-oversized-files.json"
);

/** @returns {Record<string, number>} */
function loadLegacyManifest() {
  const raw = readFileSync(LEGACY_MANIFEST_PATH, "utf8");
  const data = JSON.parse(raw);
  if (!data.files || typeof data.files !== "object") {
    throw new Error("legacy-oversized-files.json: champ 'files' manquant");
  }
  return data.files;
}

/** @param {string} dir @returns {string[]} */
function walkTsFiles(dir) {
  /** @type {string[]} */
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walkTsFiles(full));
      continue;
    }
    if (/\.(ts|tsx)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

/** @param {string} filePath */
function countLines(filePath) {
  const content = readFileSync(filePath, "utf8");
  if (content.length === 0) return 0;
  return content.split("\n").length;
}

function main() {
  const legacy = loadLegacyManifest();
  const files = walkTsFiles(SRC_ROOT);
  /** @type {string[]} */
  const errors = [];
  /** @type {string[]} */
  const warnings = [];

  for (const absPath of files) {
    const relPath = relative(REPO_ROOT, absPath).replace(/\\/g, "/");
    const lines = countLines(absPath);
    const { policy, max } = resolvePolicy(relPath);

    if (lines <= max) {
      if (legacy[relPath] !== undefined) {
        warnings.push(
          `${relPath}: ${lines} lignes (≤ ${max}, politique ${policy.name}) — retirer l’entrée de scripts/legacy-oversized-files.json`
        );
      }
      continue;
    }

    const legacyCeiling = legacy[relPath];
    if (legacyCeiling === undefined) {
      errors.push(
        `${relPath}: ${lines} lignes > plafond ${max} (${policy.name}) — découper ou, exception temporaire documentée, ajouter au manifeste legacy avec le compte exact`
      );
      continue;
    }

    if (lines > legacyCeiling) {
      errors.push(
        `${relPath}: ${lines} lignes > plafond legacy ${legacyCeiling} (était autorisé) — pas d’agrandissement ; découper le fichier`
      );
      continue;
    }

    if (lines < legacyCeiling) {
      warnings.push(
        `${relPath}: ${lines} lignes (< plafond legacy ${legacyCeiling}) — vous pouvez baisser ou retirer l’entrée du manifeste`
      );
    }
  }

  for (const relPath of Object.keys(legacy)) {
    if (!files.some((f) => relative(REPO_ROOT, f).replace(/\\/g, "/") === relPath)) {
      warnings.push(
        `${relPath}: présent dans legacy-oversized-files.json mais fichier absent — nettoyer le manifeste`
      );
    }
  }

  if (warnings.length > 0) {
    console.warn("⚠️  check-file-sizes — avertissements:\n");
    for (const w of warnings) {
      console.warn(`  - ${w}`);
    }
    console.warn("");
  }

  if (errors.length > 0) {
    console.error("❌ check-file-sizes — échec:\n");
    for (const e of errors) {
      console.error(`  - ${e}`);
    }
    console.error(
      "\nPlafonds: .cursor/rules/21-react-component-size.mdc et scripts/file-size-policy.mjs"
    );
    process.exit(1);
  }

  console.log(
    `✅ check-file-sizes: ${files.length} fichiers sous src/ conformes (politique universelle + manifeste legacy)`
  );
}

main();
