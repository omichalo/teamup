#!/usr/bin/env node
/**
 * Capture réelle de Mes inscriptions + Demandes d'adhésion (session Firebase Admin).
 * Usage : node scripts/capture-club-guide-auth-screenshots.mjs
 */

import { config } from "dotenv";
import { mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { initializeApp, cert, getApps, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync, existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SCREENSHOTS = join(ROOT, "docs/club-registration-guide/screenshots");
const BASE_URL = process.env.CLUB_GUIDE_BASE_URL ?? "http://localhost:3000";

config({ path: resolve(ROOT, ".env.local") });

function initFirebaseAdmin() {
  if (getApps().length > 0) return getApps()[0];

  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.FB_PROJECT_ID ||
    "sqyping-teamup";

  const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim().replace(
    /^["']|["']$/g,
    ""
  );

  if (saPath && existsSync(saPath)) {
    const sa = JSON.parse(readFileSync(saPath, "utf8"));
    return initializeApp({
      credential: cert(sa),
      projectId: sa.project_id || projectId,
    });
  }

  const privateKey =
    process.env.FB_PRIVATE_KEY?.replace(/\\n/g, "\n") ||
    process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const clientEmail =
    process.env.FB_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;

  if (privateKey && clientEmail) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    });
  }

  return initializeApp({ credential: applicationDefault(), projectId });
}

async function findManagerUid() {
  const preferred = process.env.CLUB_GUIDE_UID?.trim();
  if (preferred) return preferred;

  const db = getFirestore();
  for (const role of ["admin", "secretary"]) {
    const snap = await db
      .collection("users")
      .where("role", "==", role)
      .limit(1)
      .get();
    if (!snap.empty) return snap.docs[0].id;
  }

  throw new Error(
    "Aucun utilisateur admin/secretary trouvé. Définissez CLUB_GUIDE_UID ou créez un compte secrétariat."
  );
}

async function getIdToken(uid) {
  const auth = getAuth();
  const user = await auth.getUser(uid);
  if (!user.emailVerified) {
    await auth.updateUser(uid, { emailVerified: true });
  }

  const customToken = await auth.createCustomToken(uid);
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY manquant dans .env.local");

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  );
  const json = await res.json();
  if (!res.ok || !json.idToken) {
    throw new Error(json.error?.message ?? "Échec signInWithCustomToken");
  }
  return json.idToken;
}

async function createSessionCookie(idToken) {
  const res = await fetch(`${BASE_URL}/api/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: BASE_URL,
    },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Session API ${res.status}: ${err}`);
  }
  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/__session=([^;]+)/);
  if (!match) throw new Error("Cookie __session absent de la réponse");
  return match[1];
}

const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

async function screenshotPages(sessionCookie) {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const host = new URL(BASE_URL).hostname;
  await page.setCookie({
    name: "__session",
    value: sessionCookie,
    domain: host,
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
  });

  const shots = [
    {
      file: "09-mes-inscriptions.png",
      url: `${BASE_URL}/club/mes-inscriptions`,
      waitFor: "Mes inscriptions",
    },
    {
      file: "10-demandes-adhesion.png",
      url: `${BASE_URL}/club/demandes-adhesion`,
      waitFor: "Demandes",
    },
  ];

  for (const { file, url, waitFor } of shots) {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    try {
      await page.waitForFunction(
        (text) => document.body?.innerText?.includes(text),
        { timeout: 45000 },
        waitFor
      );
    } catch {
      const snippet = await page.evaluate(
        () => document.body?.innerText?.slice(0, 200) ?? ""
      );
      console.warn(`⚠️  Timeout sur ${file} — capture quand même. Extrait : ${snippet.slice(0, 80)}…`);
    }
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({
      path: join(SCREENSHOTS, file),
      fullPage: true,
    });
    console.log(`✓ ${file}`);
  }

  await browser.close();
}

async function main() {
  initFirebaseAdmin();
  const uid = await findManagerUid();
  console.log(`Compte utilisé : ${uid.slice(0, 8)}…`);

  const idToken = await getIdToken(uid);
  const sessionCookie = await createSessionCookie(idToken);

  await mkdir(SCREENSHOTS, { recursive: true });
  await screenshotPages(sessionCookie);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
