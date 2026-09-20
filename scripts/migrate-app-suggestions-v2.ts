#!/usr/bin/env ts-node

/**
 * Migration appSuggestions → schéma v2 (domain, visibility, waitingOn, lastActivityAt).
 *
 * Dry-run par défaut. Pour appliquer :
 *   APPLY=1 TS_NODE_TRANSPILE_ONLY=1 ts-node scripts/migrate-app-suggestions-v2.ts
 *
 * Prérequis : GOOGLE_APPLICATION_CREDENTIALS + NEXT_PUBLIC_FIREBASE_PROJECT_ID
 */
import { initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const {
  GOOGLE_APPLICATION_CREDENTIALS,
  FIREBASE_PRIVATE_KEY,
  FIREBASE_CLIENT_EMAIL,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  APPLY,
} = process.env;

const CLUB_CATEGORY_HINTS = [
  "stage",
  "entraineurs",
  "compta",
  "club",
  "competition",
  "compétition",
  "creneau",
  "créneau",
];

function initFirebaseAdmin() {
  if (GOOGLE_APPLICATION_CREDENTIALS || (!FIREBASE_PRIVATE_KEY && !FIREBASE_CLIENT_EMAIL)) {
    initializeApp({
      credential: applicationDefault(),
      projectId: NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
    return;
  }

  if (!FIREBASE_PRIVATE_KEY || !FIREBASE_CLIENT_EMAIL) {
    throw new Error(
      "Credentials Firebase non configurés. Fournissez GOOGLE_APPLICATION_CREDENTIALS ou FIREBASE_PRIVATE_KEY/FIREBASE_CLIENT_EMAIL."
    );
  }

  initializeApp({
    credential: cert({
      projectId: NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

function inferDomain(category: unknown): "app" | "club" {
  const value = typeof category === "string" ? category.toLowerCase() : "";
  if (CLUB_CATEGORY_HINTS.some((hint) => value.includes(hint))) {
    return "club";
  }
  return "app";
}

function inferWaitingOn(status: unknown): "none" | "handlers" {
  if (
    status === "received" ||
    status === "reviewing" ||
    status === "planned" ||
    status === "in_progress"
  ) {
    return "handlers";
  }
  return "none";
}

async function main() {
  initFirebaseAdmin();
  const db = getFirestore();
  const apply = APPLY === "1";
  const snapshot = await db.collection("appSuggestions").get();

  let planned = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const domain = data.domain === "club" || data.domain === "app"
      ? data.domain
      : inferDomain(data.category);
    const visibility =
      data.visibility === "public" ||
      data.visibility === "private" ||
      data.visibility === "legacy_staff" ||
      data.visibility === "hidden"
        ? data.visibility
        : "legacy_staff";
    const waitingOn =
      data.waitingOn === "none" ||
      data.waitingOn === "author" ||
      data.waitingOn === "handlers"
        ? data.waitingOn
        : inferWaitingOn(data.status);
    const lastActivityAt =
      data.lastActivityAt ?? data.updatedAt ?? data.createdAt ?? Timestamp.now();
    const supportCount =
      typeof data.supportCount === "number" ? data.supportCount : 0;

    const patch = {
      schemaVersion: 2,
      domain,
      visibility,
      waitingOn,
      lastActivityAt,
      supportCount,
    };

    planned += 1;
    console.log(
      `[migrate] ${docSnap.id} domain=${domain} visibility=${visibility} waitingOn=${waitingOn}`
    );

    if (apply) {
      await docSnap.ref.update(patch);
    }
  }

  console.log(
    `[migrate] ${apply ? "Appliqué" : "Dry-run"} : ${planned} document(s) sur ${snapshot.size}.`
  );
  if (!apply) {
    console.log("[migrate] Relancer avec APPLY=1 pour écrire.");
  }
}

main().catch((error) => {
  console.error("[migrate] Échec :", error);
  process.exit(1);
});
