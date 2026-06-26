export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
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
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { logAuditAction, AUDIT_ACTIONS } from "@/lib/auth/audit-logger";
import { withAuth } from "@/lib/auth/api-utils";
import type { DecodedIdToken } from "firebase-admin/auth";

interface SetRolePayload {
  userId?: string;
  role?: string;
  coachRequestStatus?: string;
  coachRequestMessage?: string | null;
  playerId?: string | null;
}

const MANAGED_ROLES: readonly UserRole[] = [
  USER_ROLES.ADMIN,
  USER_ROLES.SECRETARY,
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

export const POST = withAuth(
  async (req, context) => {
    try {
      // Valider l'origine de la requête pour prévenir les attaques CSRF
      if (!validateOrigin(req)) {
        return jsonNoStore(
          {
            success: false,
            error: "Invalid origin",
          },
          { status: 403 }
        );
      }

      const decoded = (context as { decoded: DecodedIdToken }).decoded;

      const body = (await req.json()) as SetRolePayload;

      const {
        userId,
        role,
        coachRequestStatus,
        coachRequestMessage,
        playerId,
      } = body ?? {};

    if (!userId || typeof userId !== "string") {
      return jsonNoStore(
        {
          success: false,
          error: "Invalid userId",
        },
        { status: 400 }
      );
    }

    const resolvedRole = resolveRole(role ?? null);

    if (!MANAGED_ROLES.includes(resolvedRole)) {
      return jsonNoStore(
        {
          success: false,
          error: "Invalid role",
        },
        { status: 400 }
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
        coachRequestHandledBy: decoded.uid,
        coachRequestHandledAt: now,
        coachRequestUpdatedAt: now,
        playerId: playerId !== undefined ? playerId : FieldValue.delete(),
        updatedAt: now,
      },
      { merge: true }
    );

    // Log d'audit pour la modification de rôle
    logAuditAction(AUDIT_ACTIONS.USER_ROLE_CHANGED, decoded.uid, {
      resource: "user",
      resourceId: userId,
      details: {
        oldRole: userRecord.customClaims?.role,
        newRole: resolvedRole,
        coachRequestStatus: resolvedCoachStatus,
      },
      success: true,
    });

      return jsonNoStore(
        {
          success: true,
          data: {
            userId,
            role: resolvedRole,
            coachRequestStatus: resolvedCoachStatus,
          },
        },
        { status: 200 }
      );
    } catch (error) {
      console.error("[app/api/admin/users/set-role] error", error);

      // Log d'audit pour l'échec
      try {
        const decoded = (context as { decoded: DecodedIdToken }).decoded;
        logAuditAction(AUDIT_ACTIONS.USER_ROLE_CHANGED, decoded.uid, {
          resource: "user",
          success: false,
        });
      } catch {
        // Ignorer les erreurs de logging d'audit
      }

      return jsonNoStore(
        {
          success: false,
          error: "Internal Server Error",
        },
        { status: 500 }
      );
    }
  },
  [USER_ROLES.ADMIN]
);

