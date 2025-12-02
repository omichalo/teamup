import type { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  initializeFirebaseAdmin,
  adminAuth,
  getFirestoreAdmin,
} from "@/lib/firebase-admin";
import {
  COACH_REQUEST_STATUS,
  resolveCoachRequestStatus,
  resolveRole,
  USER_ROLES,
} from "@/lib/auth/roles";
import type { CoachRequestStatus, UserRole } from "@/types";
import { requireAdmin } from "@/lib/api/auth-middleware";
import { createSecureResponse } from "@/lib/api/response-utils";
import { handleApiError, createErrorResponse } from "@/lib/api/error-handler";
import { logAuditAction, AUDIT_ACTIONS } from "@/lib/auth/audit-logger";
import { validateId } from "@/lib/api/validation-helpers";

interface SetRolePayload {
  userId?: string;
  role?: string;
  coachRequestStatus?: string;
  coachRequestMessage?: string | null;
  playerId?: string | null;
}

const MANAGED_ROLES: readonly UserRole[] = [
  USER_ROLES.ADMIN,
  USER_ROLES.COACH,
  USER_ROLES.PLAYER,
];

const resolveCoachStatusForRole = (
  requestedStatus: string | undefined,
  role: UserRole
): CoachRequestStatus => {
  const resolved = resolveCoachRequestStatus(requestedStatus ?? null);

  if (role === USER_ROLES.COACH) {
    return resolved === COACH_REQUEST_STATUS.NONE
      ? COACH_REQUEST_STATUS.APPROVED
      : resolved;
  }

  return COACH_REQUEST_STATUS.NONE;
};

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (auth instanceof Response) return auth;

    const body = (await req.json()) as SetRolePayload;

    const { userId, role, coachRequestStatus, coachRequestMessage, playerId } =
      body ?? {};

    if (!userId || typeof userId !== "string") {
      return createErrorResponse("Paramètre 'userId' invalide", 400);
    }

    const userIdError = validateId(userId, "userId");
    if (userIdError) return userIdError;

    const resolvedRole = resolveRole(role ?? null);

    if (!MANAGED_ROLES.includes(resolvedRole)) {
      return createErrorResponse(
        "Rôle invalide",
        400,
        `Le rôle '${role}' n'est pas supporté`
      );
    }

    const resolvedCoachStatus = resolveCoachStatusForRole(
      coachRequestStatus,
      resolvedRole
    );

    await initializeFirebaseAdmin();

    const userRecord = await adminAuth.getUser(userId);
    const existingClaims = userRecord.customClaims ?? {};

    await adminAuth.setCustomUserClaims(userId, {
      ...existingClaims,
      role: resolvedRole,
      coachRequestStatus: resolvedCoachStatus,
    });

    await adminAuth.revokeRefreshTokens(userId);

    const db = getFirestoreAdmin();
    const now = FieldValue.serverTimestamp();
    const userDocRef = db.collection("users").doc(userId);

    await userDocRef.set(
      {
        role: resolvedRole,
        coachRequestStatus: resolvedCoachStatus,
        coachRequestMessage:
          coachRequestMessage !== undefined
            ? coachRequestMessage
            : FieldValue.delete(),
        coachRequestHandledBy: auth.uid,
        coachRequestHandledAt: now,
        coachRequestUpdatedAt: now,
        playerId: playerId !== undefined ? playerId : FieldValue.delete(),
        updatedAt: now,
      },
      { merge: true }
    );

    // Log d'audit pour la modification de rôle
    logAuditAction(AUDIT_ACTIONS.USER_ROLE_CHANGED, auth.uid, {
      resource: "user",
      resourceId: userId,
      details: {
        oldRole: userRecord.customClaims?.role,
        newRole: resolvedRole,
        coachRequestStatus: resolvedCoachStatus,
      },
      success: true,
    });

    return createSecureResponse(
      {
        success: true,
        data: {
          userId,
          role: resolvedRole,
          coachRequestStatus: resolvedCoachStatus,
        },
      },
      200
    );
  } catch (error) {
    // Log d'audit pour l'échec
    try {
      const auth = await requireAdmin(req);
      if (!(auth instanceof Response)) {
        logAuditAction(AUDIT_ACTIONS.USER_ROLE_CHANGED, auth.uid, {
          resource: "user",
          success: false,
          details: { error: error instanceof Error ? error.message : "Unknown error" },
        });
      }
    } catch {
      // Ignorer les erreurs de logging d'audit
    }

    return handleApiError(error, {
      context: "app/api/admin/users/set-role",
      defaultMessage: "Erreur lors de la mise à jour du rôle",
    });
  }
}


