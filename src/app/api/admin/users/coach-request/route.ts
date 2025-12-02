import type { NextRequest } from "next/server";
import {
  initializeFirebaseAdmin,
  adminAuth,
  getFirestoreAdmin,
} from "@/lib/firebase-admin";
import {
  USER_ROLES,
  COACH_REQUEST_STATUS,
} from "@/lib/auth/roles";
import { FieldValue } from "firebase-admin/firestore";
import type { CoachRequestStatus, UserRole } from "@/types";
import { requireAdmin } from "@/lib/api/auth-middleware";
import { createSecureResponse } from "@/lib/api/response-utils";
import { handleApiError, createErrorResponse } from "@/lib/api/error-handler";
import { logAuditAction, AUDIT_ACTIONS } from "@/lib/auth/audit-logger";

interface CoachRequestUpdatePayload {
  userId?: string;
  action?: "approve" | "reject";
  role?: string;
  message?: string | null;
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (auth instanceof Response) return auth;

    const {
      userId,
      action,
      role: targetRoleRaw,
      message,
    }: CoachRequestUpdatePayload = await req.json();

    if (!userId || (action !== "approve" && action !== "reject")) {
      return createErrorResponse("Paramètres invalides", 400);
    }

    await initializeFirebaseAdmin();

    const db = getFirestoreAdmin();
    const now = FieldValue.serverTimestamp();

    if (action === "approve") {
      const targetRole: UserRole =
        targetRoleRaw === USER_ROLES.ADMIN
          ? USER_ROLES.ADMIN
          : USER_ROLES.COACH;
      const userRecord = await adminAuth.getUser(userId);
      const claims = userRecord.customClaims ?? {};

      await adminAuth.setCustomUserClaims(userId, {
        ...claims,
        role: targetRole,
        coachRequestStatus: COACH_REQUEST_STATUS.APPROVED as CoachRequestStatus,
      });
      await adminAuth.revokeRefreshTokens(userId);

      // Utiliser le SDK Admin directement pour bypass les règles Firestore
      const userDocRef = db.collection("users").doc(userId);
      await userDocRef.set(
        {
          role: targetRole,
          coachRequestStatus: COACH_REQUEST_STATUS.APPROVED,
          coachRequestMessage: message !== undefined ? message : null,
          coachRequestHandledBy: auth.uid,
          coachRequestHandledAt: now,
          coachRequestUpdatedAt: now,
          updatedAt: now,
        },
        { merge: true }
      );

      // Log d'audit pour l'approbation
      logAuditAction(AUDIT_ACTIONS.COACH_REQUEST_APPROVED, auth.uid, {
        resource: "user",
        resourceId: userId,
        details: {
          targetRole,
          message: message ? "***" : null, // Masquer le message
        },
        success: true,
      });
    } else {
      await db
        .collection("users")
        .doc(userId)
        .set(
          {
            coachRequestStatus: COACH_REQUEST_STATUS.REJECTED,
            coachRequestMessage: message ?? null,
            coachRequestHandledBy: auth.uid,
            coachRequestHandledAt: now,
            coachRequestUpdatedAt: now,
            updatedAt: now,
          },
          { merge: true }
        );

      // Log d'audit pour le rejet
      logAuditAction(AUDIT_ACTIONS.COACH_REQUEST_REJECTED, auth.uid, {
        resource: "user",
        resourceId: userId,
        details: {
          message: message ? "***" : null, // Masquer le message
        },
        success: true,
      });
    }

    return createSecureResponse({ success: true }, 200);
  } catch (error) {
    return handleApiError(error, {
      context: "app/api/admin/users/coach-request",
      defaultMessage: "Impossible de mettre à jour la demande",
    });
  }
}
