import { NextApiRequest, NextApiResponse } from "next";
import {
  initializeFirebaseAdmin,
  adminAuth,
  adminDb,
} from "@/lib/firebase-admin";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { hasAnyRole, USER_ROLES } from "@/lib/auth/roles";

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (!req.user || !hasAnyRole(req.user.role, [USER_ROLES.ADMIN])) {
      return res.status(403).json({ error: "Accès refusé" });
    }
    const { email, password, displayName } = req.body;

    if (!email || !password || !displayName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await initializeFirebaseAdmin();

    // Créer l&apos;utilisateur dans Firebase Auth
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName,
    });

    console.log("✅ Utilisateur créé dans Firebase Auth:", userRecord.uid);

    // Créer l&apos;utilisateur dans Firestore
    const db = adminDb;
    const userData = {
      email,
      displayName,
      role: "player",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("users").doc(userRecord.uid).set(userData);

    console.log("✅ Utilisateur créé dans Firestore:", userRecord.uid);

    res.status(200).json({
      success: true,
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
    });
  } catch (error) {
    console.error("❌ Erreur lors de la création de l&apos;utilisateur:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default withAuth(handler);
