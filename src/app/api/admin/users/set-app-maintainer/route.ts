export const runtime = "nodejs";

import { jsonNoStore } from "@/lib/http/cache-headers";
import { cookies } from "next/headers";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, getFirestoreAdmin } from "@/lib/firebase-admin";
import { hasAnyRole, resolveRole, USER_ROLES } from "@/lib/auth/roles";
import { validateOrigin } from "@/lib/auth/csrf-utils";
import { logAuditAction, AUDIT_ACTIONS } from "@/lib/auth/audit-logger";

interface SetAppMaintainerPayload {
  userId?: string;
  appMaintainer?: boolean;
}

/** POST /api/admin/users/set-app-maintainer — active ou désactive le statut mainteneur app. */
export async function POST(req: Request) {
  if (!validateOrigin(req)) {
    return jsonNoStore(
      { success: false, error: "Invalid origin", message: "Requête non autorisée" },
      { status: 403 }
    );
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value;
  if (!sessionCookie) {
    return jsonNoStore(
      { success: false, error: "Session cookie requis" },
      { status: 401 }
    );
  }

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const requesterRole = resolveRole(decoded.role as string | undefined);

    if (!hasAnyRole(requesterRole, [USER_ROLES.ADMIN])) {
      return jsonNoStore(
        {
          success: false,
          error: "Accès refusé",
          message: "Seuls les administrateurs peuvent modifier ce paramètre",
        },
        { status: 403 }
      );
    }

    const body = (await req.json()) as SetAppMaintainerPayload;
    const { userId, appMaintainer } = body ?? {};

    if (!userId || typeof userId !== "string") {
      return jsonNoStore(
        { success: false, error: "Paramètre 'userId' invalide" },
        { status: 400 }
      );
    }

    if (typeof appMaintainer !== "boolean") {
      return jsonNoStore(
        { success: false, error: "Paramètre 'appMaintainer' invalide" },
        { status: 400 }
      );
    }

    const db = getFirestoreAdmin();
    let userRecord;
    try {
      userRecord = await adminAuth.getUser(userId);
    } catch {
      return jsonNoStore(
        { success: false, error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    const userDocRef = db.collection("users").doc(userId);
    const userSnap = await userDocRef.get();
    const existingProfile = userSnap.exists ? userSnap.data() : undefined;
    const customClaims = userRecord.customClaims ?? {};

    await userDocRef.set(
      {
        email:
          userRecord.email ??
          (typeof existingProfile?.email === "string"
            ? existingProfile.email
            : ""),
        displayName:
          userRecord.displayName ??
          (typeof existingProfile?.displayName === "string"
            ? existingProfile.displayName
            : ""),
        role: resolveRole(
          (typeof customClaims.role === "string"
            ? customClaims.role
            : undefined) ??
            (typeof existingProfile?.role === "string"
              ? existingProfile.role
              : undefined)
        ),
        appMaintainer,
        updatedAt: FieldValue.serverTimestamp(),
        ...(!userSnap.exists ? { createdAt: FieldValue.serverTimestamp() } : {}),
      },
      { merge: true }
    );

    logAuditAction(AUDIT_ACTIONS.USER_APP_MAINTAINER_CHANGED, decoded.uid, {
      resource: "user",
      resourceId: userId,
      details: { appMaintainer },
      success: true,
    });

    return jsonNoStore({ success: true, appMaintainer }, { status: 200 });
  } catch (error) {
    console.error("[api/admin/users/set-app-maintainer POST]", error);
    return jsonNoStore(
      { success: false, error: "Impossible de mettre à jour le mainteneur" },
      { status: 500 }
    );
  }
}
