#!/usr/bin/env ts-node

/**
 * Script de mise à jour des claims Firebase pour attribuer le rôle ADMIN.
 *
 * Usage :
 *   TS_NODE_TRANSPILE_ONLY=1 ts-node scripts/grant-admin.ts <uid>
 *
 * Pré-requis :
 *   - Vous devez disposer de credentials Firebase Admin valides.
 *     * soit via GOOGLE_APPLICATION_CREDENTIALS (service account)
 *     * soit via `gcloud auth application-default login` (Application Default Credentials)
 */
import { initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const { GOOGLE_APPLICATION_CREDENTIALS, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, NEXT_PUBLIC_FIREBASE_PROJECT_ID } = process.env;

function initFirebaseAdmin() {
  if (GOOGLE_APPLICATION_CREDENTIALS || (!FIREBASE_PRIVATE_KEY && !FIREBASE_CLIENT_EMAIL)) {
    // Utilise par défaut les Application Default Credentials
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
  const uid = process.argv[2];

  if (!uid) {
    console.error("Usage: ts-node scripts/grant-admin.ts <UID_UTILISATEUR>");
    process.exit(1);
  }

  initFirebaseAdmin();

  const auth = getAuth();
  const userRecord = await auth.getUser(uid);
  const existingClaims = userRecord.customClaims ?? {};

  await auth.setCustomUserClaims(uid, {
    ...existingClaims,
    role: "admin",
    coachRequestStatus: "approved",
  });

  await auth.revokeRefreshTokens(uid);

  console.log(`✅ Les claims admin ont été appliqués à l'utilisateur ${uid}.`);
  console.log("ℹ️ Déconnecte-toi/reconnecte-toi pour rafraîchir ton token côté client.");
}

main().catch((error) => {
  console.error("❌ Erreur lors de l'attribution du rôle admin:", error);
  process.exit(1);
});
