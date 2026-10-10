#!/usr/bin/env node
/**
 * Vérifie que chaque page App Router (src/app/.../page.tsx) expose un titre
 * dédié (metadata / pageMetadata), via la page elle-même ou un layout.tsx
 * ancêtre — hors layout racine (titre par défaut insuffisant).
 *
 * Exemptions : pages qui ne font que redirect(...).
 */

import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { dirname, join, relative } from "path";
import { fileURLToPath } from "url";

const REPO_ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const APP_ROOT = join(REPO_ROOT, "src", "app");

/** @param {string} dir @returns {string[]} */
function walkPageFiles(dir) {
  /** @type {string[]} */
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      // Les route handlers API n'ont pas de page.tsx ; on parcourt tout app/
      out.push(...walkPageFiles(full));
      continue;
    }
    if (name === "page.tsx") {
      out.push(full);
    }
  }
  return out;
}

/** @param {string} source */
function isRedirectOnlyPage(source) {
  const withoutComments = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  const hasRedirect = /\bredirect\s*\(/.test(withoutComments);
  const hasDefaultExport = /\bexport\s+default\b/.test(withoutComments);
  const hasMetadata =
    /\bexport\s+const\s+metadata\b/.test(withoutComments) ||
    /\bexport\s+(async\s+)?function\s+generateMetadata\b/.test(withoutComments);
  if (!hasRedirect || !hasDefaultExport || hasMetadata) return false;
  // Page « coquille » : peu de lignes hors imports / redirect.
  const meaningful = withoutComments
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("import ") && !l.startsWith("} from"));
  return meaningful.length <= 12;
}

/** @param {string} source */
function exportsDedicatedTitle(source) {
  if (/\bpageMetadata\s*\(/.test(source) && /\bexport\s+const\s+metadata\b/.test(source)) {
    return true;
  }
  if (
    /\bexport\s+const\s+metadata\b/.test(source) &&
    /\btitle\s*:/.test(source)
  ) {
    return true;
  }
  if (
    /\bexport\s+(async\s+)?function\s+generateMetadata\b/.test(source) &&
    /\btitle\s*:/.test(source)
  ) {
    return true;
  }
  return false;
}

/**
 * Layouts du segment jusqu'au parent de `src/app` (exclu le layout racine).
 * @param {string} pagePath
 */
function ancestorLayoutsWithTitle(pagePath) {
  let dir = dirname(pagePath);
  while (dir.startsWith(APP_ROOT) && dir !== APP_ROOT) {
    const layoutPath = join(dir, "layout.tsx");
    if (existsSync(layoutPath)) {
      const source = readFileSync(layoutPath, "utf8");
      if (exportsDedicatedTitle(source)) {
        return true;
      }
    }
    dir = dirname(dir);
  }
  return false;
}

/** @param {string} pagePath */
function pageHasDedicatedTitle(pagePath) {
  const source = readFileSync(pagePath, "utf8");
  if (isRedirectOnlyPage(source)) {
    return { ok: true, reason: "redirect-only" };
  }
  if (exportsDedicatedTitle(source)) {
    return { ok: true, reason: "page-metadata" };
  }
  if (ancestorLayoutsWithTitle(pagePath)) {
    return { ok: true, reason: "layout-metadata" };
  }
  return { ok: false, reason: "missing" };
}

function main() {
  if (!existsSync(APP_ROOT)) {
    console.error("❌ check-page-titles: src/app introuvable");
    process.exit(1);
  }

  const pages = walkPageFiles(APP_ROOT).sort();
  /** @type {string[]} */
  const missing = [];
  let exemptRedirect = 0;

  for (const pagePath of pages) {
    const rel = relative(REPO_ROOT, pagePath);
    const result = pageHasDedicatedTitle(pagePath);
    if (result.reason === "redirect-only") {
      exemptRedirect += 1;
      continue;
    }
    if (!result.ok) {
      missing.push(rel);
    }
  }

  if (missing.length > 0) {
    console.error("❌ check-page-titles — titres manquants:\n");
    for (const rel of missing) {
      console.error(`  - ${rel}`);
    }
    console.error(
      "\nChaque page doit exporter `metadata` / `generateMetadata` avec un `title`,"
    );
    console.error(
      "ou un `layout.tsx` du segment (hors layout racine) via `pageMetadata(\"…\")`."
    );
    console.error("Voir `.cursor/rules/10-nextjs-app-router.mdc` et `src/lib/seo/page-metadata.ts`.\n");
    process.exit(1);
  }

  console.log(
    `✅ check-page-titles: ${pages.length} pages OK` +
      (exemptRedirect > 0 ? ` (${exemptRedirect} redirect-only exemptée(s))` : "")
  );
}

main();
