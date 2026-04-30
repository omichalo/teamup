import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getFirestoreAdmin, adminAuth } from "@/lib/firebase-admin";
import { hasAnyRole, USER_ROLES, COACH_REQUEST_STATUS, resolveRole } from "@/lib/auth/roles";
import { FieldValue } from "firebase-admin/firestore";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { logAuditAction, AUDIT_ACTIONS } from "@/lib/auth/audit-logger";

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

    // Log d'audit pour la demande de rôle coach
    logAuditAction(AUDIT_ACTIONS.COACH_REQUEST_SUBMITTED, decoded.uid, {
      resource: "user",
      details: {
        message: message ? "***" : null, // Masquer le message potentiel
      },
      success: true,
    });

    const res = NextResponse.json({ success: true }, { status: 200 });
    // Ajouter Cache-Control pour éviter la mise en cache de données potentiellement sensibles
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    return res;
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


