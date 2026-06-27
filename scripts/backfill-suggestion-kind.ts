#!/usr/bin/env ts-node

/**
 * Renseigne kind: "improvement" sur les retours existants sans type.
 *
 * Usage :
 *   TS_NODE_TRANSPILE_ONLY=1 ts-node scripts/backfill-suggestion-kind.ts
 */
import { initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const {
  GOOGLE_APPLICATION_CREDENTIALS,
  FIREBASE_PRIVATE_KEY,
  FIREBASE_CLIENT_EMAIL,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID,
} = process.env;

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

async function main() {
  initFirebaseAdmin();
  const db = getFirestore();
  const snapshot = await db.collection("appSuggestions").get();

  let updated = 0;

  for (const docSnap of snapshot.docs) {
    const kind = docSnap.get("kind");
    if (kind === "improvement" || kind === "problem") {
      continue;
    }

    await docSnap.ref.update({ kind: "improvement" });
    updated += 1;
    console.log(`[backfill] ${docSnap.id} -> kind=improvement`);
  }

  console.log(
    `[backfill] Terminé : ${updated} document(s) mis à jour sur ${snapshot.size} retour(s).`
  );
}

main().catch((error) => {
  console.error("[backfill] Échec :", error);
  process.exit(1);
});
