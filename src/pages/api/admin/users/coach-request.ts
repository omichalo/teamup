import type { NextApiResponse } from "next";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import {
  initializeFirebaseAdmin,
  adminAuth,
  getFirestoreAdmin,
} from "@/lib/firebase-admin";
import { USER_ROLES, COACH_REQUEST_STATUS } from "@/lib/auth/roles";
import { hasAnyRole } from "@/lib/auth/roles";
import { firestoreUserService } from "@/lib/services/firestore-user-service";
import { FieldValue } from "firebase-admin/firestore";

interface CoachRequestUpdatePayload {
  userId?: string;
  action?: "approve" | "reject";
  role?: string;
  message?: string | null;
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  if (!req.user || !hasAnyRole(req.user.role, [USER_ROLES.ADMIN])) {
    return res.status(403).json({ success: false, error: "Accès refusé" });
  }

  const { userId, action, role, message }: CoachRequestUpdatePayload =
    typeof req.body === "string" ? JSON.parse(req.body) : req.body;

  if (!userId || (action !== "approve" && action !== "reject")) {
    return res.status(400).json({ success: false, error: "Paramètres invalides" });
  }

  await initializeFirebaseAdmin();

  const db = getFirestoreAdmin();
  const now = FieldValue.serverTimestamp();

  try {
    if (action === "approve") {
      const targetRole = role === USER_ROLES.ADMIN ? USER_ROLES.ADMIN : USER_ROLES.COACH;
      const userRecord = await adminAuth.getUser(userId);
      const claims = userRecord.customClaims ?? {};
      await adminAuth.setCustomUserClaims(userId, {
        ...claims,
        role: targetRole,
        coachRequestStatus: COACH_REQUEST_STATUS.APPROVED,
      });
      await adminAuth.revokeRefreshTokens(userId);

      await firestoreUserService.upsertUser(
        userId,
        {
          role: targetRole,
          coachRequestStatus: COACH_REQUEST_STATUS.APPROVED,
          coachRequestMessage: message ?? null,
          coachRequestHandledBy: req.user.uid,
          coachRequestHandledAt: new Date(),
          coachRequestUpdatedAt: new Date(),
        },
        { merge: true }
      );
    } else {
      await db.collection("users").doc(userId).set(
        {
          coachRequestStatus: COACH_REQUEST_STATUS.REJECTED,
          coachRequestMessage: message ?? null,
          coachRequestHandledBy: req.user.uid,
          coachRequestHandledAt: now,
          coachRequestUpdatedAt: now,
          updatedAt: now,
        },
        { merge: true }
      );
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[admin/coach-request] error", error);
    return res.status(500).json({
      success: false,
      error: "Impossible de mettre à jour la demande",
    });
  }
}

export default withAuth(handler);
