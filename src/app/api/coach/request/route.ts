import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getFirestoreAdmin, adminAuth } from "@/lib/firebase-admin";
import { hasAnyRole, USER_ROLES, COACH_REQUEST_STATUS, resolveRole } from "@/lib/auth/roles";
import { FieldValue } from "firebase-admin/firestore";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { logAuditAction, AUDIT_ACTIONS } from "@/lib/auth/audit-logger";

export async function POST(req: Request) {
  try {
    // Valider l'origine de la requête pour prévenir les attaques CSRF
    if (!(await validateOrigin(req))) {
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
        { success: false, error: "Authentification requise" },
        { status: 401 }
      );
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const role = resolveRole(decoded.role as string | undefined);

    if (
      !hasAnyRole(role, [USER_ROLES.PLAYER]) &&
      !hasAnyRole(role, [USER_ROLES.COACH, USER_ROLES.ADMIN])
    ) {
      return NextResponse.json(
        { success: false, error: "Accès refusé" },
        { status: 403 }
      );
    }

    const { message } = (await req.json()) ?? {};

    const db = getFirestoreAdmin();
    const userRef = db.collection("users").doc(decoded.uid);

    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      await userRef.set({
        email: decoded.email,
        role,
        coachRequestStatus: COACH_REQUEST_STATUS.PENDING,
        coachRequestUpdatedAt: FieldValue.serverTimestamp(),
        coachRequestMessage: message || null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      await userRef.update({
        coachRequestStatus: COACH_REQUEST_STATUS.PENDING,
        coachRequestUpdatedAt: FieldValue.serverTimestamp(),
        coachRequestMessage: message || null,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    console.log("[app/api/coach/request] Coach request submitted successfully", {
      uid: decoded.uid,
    });

    // Log d'audit pour la demande de coach
    logAuditAction(AUDIT_ACTIONS.COACH_REQUEST_SUBMITTED, decoded.uid, {
      resource: "coach_request",
      success: true,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[app/api/coach/request] error", error);
    return NextResponse.json(
      {
        success: false,
        error: "Impossible d'enregistrer la demande",
      },
      { status: 500 }
    );
  }
}


