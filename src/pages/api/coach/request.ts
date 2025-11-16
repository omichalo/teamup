import type { NextApiResponse } from "next";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { hasAnyRole, USER_ROLES, COACH_REQUEST_STATUS } from "@/lib/auth/roles";
import { FieldValue } from "firebase-admin/firestore";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  if (!req.user) {
    return res.status(401).json({ success: false, error: "Authentification requise" });
  }

  if (!hasAnyRole(req.user.role, [USER_ROLES.PLAYER]) && !hasAnyRole(req.user.role, [USER_ROLES.COACH, USER_ROLES.ADMIN])) {
    return res.status(403).json({ success: false, error: "Accès refusé" });
  }

  const { message } = req.body ?? {};

  try {
    const db = getFirestoreAdmin();
    const userRef = db.collection("users").doc(req.user.uid);

    // Vérifier si le document existe
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      // Créer le document s'il n'existe pas
      await userRef.set({
        email: req.user.email,
        role: req.user.role || "player",
        coachRequestStatus: COACH_REQUEST_STATUS.PENDING,
        coachRequestUpdatedAt: FieldValue.serverTimestamp(),
        coachRequestMessage: message || null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      // Mettre à jour le document existant
      await userRef.update({
        coachRequestStatus: COACH_REQUEST_STATUS.PENDING,
        coachRequestUpdatedAt: FieldValue.serverTimestamp(),
        coachRequestMessage: message || null,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    console.log("[coach/request] Coach request submitted successfully", { uid: req.user.uid });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[coach/request] error", error);
    return res.status(500).json({
      success: false,
      error: "Impossible d'enregistrer la demande",
    });
  }
}

export default withAuth(handler);
