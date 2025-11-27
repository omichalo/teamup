import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import {
  initializeFirebaseAdmin,
  adminAuth,
  getFirestoreAdmin,
} from "@/lib/firebase-admin";
import {
  USER_ROLES,
  COACH_REQUEST_STATUS,
  hasAnyRole,
  resolveRole,
} from "@/lib/auth/roles";
import { FieldValue } from "firebase-admin/firestore";
import type { CoachRequestStatus, UserRole } from "@/types";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { logAuditAction, AUDIT_ACTIONS } from "@/lib/auth/audit-logger";

interface CoachRequestUpdatePayload {
  userId?: string;
  action?: "approve" | "reject";
  role?: string;
  message?: string | null;
}

export async function PATCH(req: NextRequest) {
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
    const role = resolveRole(decoded.role as string | undefined);

    if (!hasAnyRole(role, [USER_ROLES.ADMIN])) {
      return NextResponse.json(
        { success: false, error: "Accès refusé" },
        { status: 403 }
      );
    }

    const {
      userId,
      action,
      role: targetRoleRaw,
      message,
    }: CoachRequestUpdatePayload = await req.json();

    if (!userId || (action !== "approve" && action !== "reject")) {
      return NextResponse.json(
        { success: false, error: "Paramètres invalides" },
        { status: 400 }
      );
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
          coachRequestHandledBy: decoded.uid,
          coachRequestHandledAt: now,
          coachRequestUpdatedAt: now,
          updatedAt: now,
        },
        { merge: true }
      );

      // Log d'audit pour l'approbation
      logAuditAction(AUDIT_ACTIONS.COACH_REQUEST_APPROVED, decoded.uid, {
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
            coachRequestHandledBy: decoded.uid,
            coachRequestHandledAt: now,
            coachRequestUpdatedAt: now,
            updatedAt: now,
          },
          { merge: true }
        );

      // Log d'audit pour le rejet
      logAuditAction(AUDIT_ACTIONS.COACH_REQUEST_REJECTED, decoded.uid, {
        resource: "user",
        resourceId: userId,
        details: {
          message: message ? "***" : null, // Masquer le message
        },
        success: true,
      });
    }

    const res = NextResponse.json({ success: true }, { status: 200 });
    res.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    return res;
  } catch (error) {
    console.error("[app/api/admin/users/coach-request] error", error);
    return NextResponse.json(
      {
        success: false,
        error: "Impossible de mettre à jour la demande",
      },
      { status: 500 }
    );
  }
}
