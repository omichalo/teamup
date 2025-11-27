import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
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
import type { CoachRequestStatus, UserRole } from "@/types";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { logAuditAction, AUDIT_ACTIONS } from "@/lib/auth/audit-logger";

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

export async function POST(req: NextRequest) {
  try {
    // Valider l'origine de la requête pour prévenir les attaques CSRF
    if (!validateOrigin(req)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid origin",
          message: "Requête non autorisée",
        },
        { status: 403 }
      );
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;
    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: "Session cookie requis" },
        { status: 401 }
      );
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const requesterRole = resolveRole(decoded.role as string | undefined);

    if (!hasAnyRole(requesterRole, ADMIN_ONLY_ROLES)) {
      return NextResponse.json(
        {
          success: false,
          error: "Accès refusé",
          message: "Seuls les administrateurs peuvent modifier les rôles",
        },
        { status: 403 }
      );
    }

    const body = (await req.json()) as SetRolePayload;

    const { userId, role, coachRequestStatus, coachRequestMessage, playerId } =
      body ?? {};

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Paramètre 'userId' invalide",
        },
        { status: 400 }
      );
    }

    const resolvedRole = resolveRole(role ?? null);

    if (!MANAGED_ROLES.includes(resolvedRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Rôle invalide",
          details: `Le rôle '${role}' n'est pas supporté`,
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

    const res = NextResponse.json(
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
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    return res;
  } catch (error) {
    console.error("[app/api/admin/users/set-role] error", error);
    
    // Log d'audit pour l'échec
    try {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get("__session")?.value;
      if (sessionCookie) {
        const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
        logAuditAction(AUDIT_ACTIONS.USER_ROLE_CHANGED, decoded.uid, {
          resource: "user",
          success: false,
          details: { error: error instanceof Error ? error.message : "Unknown error" },
        });
      }
    } catch {
      // Ignorer les erreurs de logging d'audit
    }

    const res = NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la mise à jour du rôle",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return res;
  }
}


