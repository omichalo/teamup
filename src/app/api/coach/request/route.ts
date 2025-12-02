import type { NextRequest } from "next/server";
import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { USER_ROLES, COACH_REQUEST_STATUS } from "@/lib/auth/roles";
import { FieldValue } from "firebase-admin/firestore";
import { requireAuth } from "@/lib/api/auth-middleware";
import { createSecureResponse } from "@/lib/api/response-utils";
import { handleApiError, createErrorResponse } from "@/lib/api/error-handler";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof Response) return auth;

    // Vérifier que l'utilisateur est player, coach ou admin
    if (
      auth.role !== USER_ROLES.PLAYER &&
      auth.role !== USER_ROLES.COACH &&
      auth.role !== USER_ROLES.ADMIN
    ) {
      return createErrorResponse("Accès refusé", 403);
    }

    const { message } = (await req.json()) ?? {};

    const db = getFirestoreAdmin();
    const userRef = db.collection("users").doc(auth.uid);

    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      await userRef.set({
        email: auth.decoded.email,
        role: auth.role,
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
      uid: auth.uid,
    });

    return createSecureResponse({ success: true }, 200);
  } catch (error) {
    return handleApiError(error, {
      context: "app/api/coach/request",
      defaultMessage: "Impossible d'enregistrer la demande",
    });
  }
}


