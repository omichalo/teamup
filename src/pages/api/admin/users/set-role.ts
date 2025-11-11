import { NextApiResponse } from "next";
import { FieldValue } from "firebase-admin/firestore";
import { withAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import {
  initializeFirebaseAdmin,
  adminAuth,
  getFirestoreAdmin,
} from "@/lib/firebase-admin";
import {
  COACH_REQUEST_STATUS,
  hasAnyRole,
  resolveCoachRequestStatus,
  resolveRole,
  USER_ROLES,
} from "@/lib/auth/roles";
import { CoachRequestStatus, UserRole } from "@/types";

interface SetRolePayload {
  userId?: string;
  role?: string;
  coachRequestStatus?: string;
  coachRequestMessage?: string | null;
  playerId?: string | null;
}

const ADMIN_ONLY_ROLES: readonly UserRole[] = [USER_ROLES.ADMIN];
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

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!req.user || !hasAnyRole(req.user.role, ADMIN_ONLY_ROLES)) {
    return res.status(403).json({
      success: false,
      error: "Accès refusé",
      message: "Seuls les administrateurs peuvent modifier les rôles",
    });
  }

  const body: SetRolePayload = typeof req.body === "string"
    ? JSON.parse(req.body)
    : req.body;

  const { userId, role, coachRequestStatus, coachRequestMessage, playerId } =
    body ?? {};

  if (!userId || typeof userId !== "string") {
    return res.status(400).json({
      success: false,
      error: "Paramètre 'userId' invalide",
    });
  }

  const resolvedRole = resolveRole(role ?? null);

  if (!MANAGED_ROLES.includes(resolvedRole)) {
    return res.status(400).json({
      success: false,
      error: "Rôle invalide",
      details: `Le rôle '${role}' n'est pas supporté`,
    });
  }

  const resolvedCoachStatus = resolveCoachStatusForRole(
    coachRequestStatus,
    resolvedRole
  );

  try {
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
        coachRequestHandledBy: req.user.uid,
        coachRequestHandledAt: now,
        coachRequestUpdatedAt: now,
        playerId:
          playerId !== undefined ? playerId : FieldValue.delete(),
        updatedAt: now,
      },
      { merge: true }
    );

    return res.status(200).json({
      success: true,
      data: {
        userId,
        role: resolvedRole,
        coachRequestStatus: resolvedCoachStatus,
      },
    });
  } catch (error) {
    console.error("[set-role] error", error);
    return res.status(500).json({
      success: false,
      error: "Erreur lors de la mise à jour du rôle",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default withAuth(handler);

