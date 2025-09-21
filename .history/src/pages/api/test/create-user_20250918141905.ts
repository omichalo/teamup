import { NextApiRequest, NextApiResponse } from "next";
import {
  initializeFirebaseAdmin,
  getFirebaseAdmin,
} from "@/lib/firebase-admin";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, password, displayName } = req.body;

    if (!email || !password || !displayName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await initializeFirebaseAdmin();
    const admin = getFirebaseAdmin();

    // Créer l'utilisateur dans Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,
    });

    console.log("✅ Utilisateur créé dans Firebase Auth:", userRecord.uid);

    // Créer l'utilisateur dans Firestore
    const db = admin.firestore();
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
    console.error("❌ Erreur lors de la création de l'utilisateur:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
