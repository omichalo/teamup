#!/usr/bin/env node
/**
 * Génère le guide PDF « Parcours d'inscription club ».
 *
 * Usage : node scripts/generate-club-registration-guide-pdf.mjs
 *
 * Prérequis : Google Chrome ou Chromium installé.
 * Captures auth optionnelles : CLUB_GUIDE_EMAIL, CLUB_GUIDE_PASSWORD
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const GUIDE_DIR = join(ROOT, "docs/club-registration-guide");
const SCREENSHOTS = join(GUIDE_DIR, "screenshots");
const MOCKUPS = join(GUIDE_DIR, "mockups");
const HTML_PATH = join(GUIDE_DIR, "guide.html");
const PDF_PATH = join(GUIDE_DIR, "Guide-Inscription-Club-SQY-Ping.pdf");
const BASE_URL = process.env.CLUB_GUIDE_BASE_URL ?? "http://localhost:3000";

const CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "google-chrome",
  "chromium",
];

async function resolveChrome() {
  for (const bin of CHROME_CANDIDATES) {
    try {
      await execFileAsync(bin, ["--version"]);
      return bin;
    } catch {
      /* try next */
    }
  }
  throw new Error(
    "Chrome/Chromium introuvable. Installez Google Chrome ou définissez CHROME_PATH."
  );
}

const CHROME_PATH = process.env.CHROME_PATH ?? (await resolveChrome());

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function chromeScreenshot(url, output, width = 1440, height = 1200) {
  await execFileAsync(CHROME_PATH, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    `--window-size=${width},${height}`,
    `--screenshot=${output}`,
    url,
  ]);
}

async function chromePdf(htmlFile, pdfFile) {
  await execFileAsync(CHROME_PATH, [
    "--headless=new",
    "--disable-gpu",
    "--no-pdf-header-footer",
    `--print-to-pdf=${pdfFile}`,
    `file://${htmlFile}`,
  ]);
}

async function screenshotMockups() {
  const pairs = [
    [join(MOCKUPS, "mes-inscriptions.html"), "09-mes-inscriptions.png", 1440, 900],
    [join(MOCKUPS, "demandes-adhesion.html"), "10-demandes-adhesion.png", 1440, 1100],
  ];
  for (const [html, png, w, h] of pairs) {
    const target = join(SCREENSHOTS, png);
    if (await fileExists(target) && !process.env.CLUB_GUIDE_FORCE_MOCKUPS) {
      console.log(`• ${png} déjà présent`);
      continue;
    }
    await chromeScreenshot(`file://${html}`, target, w, h);
    console.log(`✓ ${png}`);
  }
}

async function captureAuthPages() {
  const email = process.env.CLUB_GUIDE_EMAIL;
  const password = process.env.CLUB_GUIDE_PASSWORD;
  if (!email || !password) {
    console.log(
      "ℹ️  Pas de CLUB_GUIDE_EMAIL/PASSWORD — mockups pour Mes inscriptions et Demandes."
    );
    return;
  }

  const puppeteer = await import("puppeteer").catch(() => null);
  if (!puppeteer) {
    console.log("ℹ️  Installez puppeteer pour les captures auth automatisées.");
    return;
  }

  const browser = await puppeteer.default.launch({
    headless: true,
    executablePath: CHROME_PATH,
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle2" });
    await page.type('input[type="email"], [name="email"]', email);
    await page.type('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 20000 });

    await page.goto(`${BASE_URL}/club/mes-inscriptions`, { waitUntil: "networkidle2" });
    await page.screenshot({
      path: join(SCREENSHOTS, "09-mes-inscriptions.png"),
      fullPage: true,
    });

    await page.goto(`${BASE_URL}/club/demandes-adhesion`, { waitUntil: "networkidle2" });
    await page.screenshot({
      path: join(SCREENSHOTS, "10-demandes-adhesion.png"),
      fullPage: true,
    });
    console.log("✓ Captures authentifiées");
  } catch (err) {
    console.warn("⚠️  Capture auth échouée :", err.message);
  } finally {
    await browser.close();
  }
}

async function main() {
  await mkdir(SCREENSHOTS, { recursive: true });
  await mkdir(MOCKUPS, { recursive: true });

  console.log(`Chrome : ${CHROME_PATH}`);
  await screenshotMockups();
  await captureAuthPages();
  await chromePdf(HTML_PATH, PDF_PATH);
  console.log(`✓ PDF : ${PDF_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
