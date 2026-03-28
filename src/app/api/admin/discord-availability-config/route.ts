export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";
import { hasAnyRole, USER_ROLES, resolveRole } from "@/lib/auth/roles";
import { validateOrigin, validateCSRFToken } from "@/lib/auth/csrf-utils";
import {
  getFirestoreAdmin,
  initializeFirebaseAdmin,
} from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const COLLECTION_NAME = "discordAvailabilityConfig";
const DOCUMENT_ID = "default";

/**
 * GET - Récupère la configuration des channels Discord pour les sondages
 */
export async function GET() {
  try {
    // Vérifier l'authentification
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    if (!decoded.email_verified) {
      return NextResponse.json(
        { success: false, error: "Email non vérifié" },
        { status: 403 }
      );
    }

    // Vérifier que l'utilisateur est admin
    const role = resolveRole(decoded.role as string | undefined);
    if (!hasAnyRole(role, [USER_ROLES.ADMIN])) {
      return NextResponse.json(
        { success: false, error: "Accès refusé - Admin uniquement" },
        { status: 403 }
      );
    }

    await initializeFirebaseAdmin();
    const db = getFirestoreAdmin();
    const docRef = db.collection(COLLECTION_NAME).doc(DOCUMENT_ID);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({
        success: true,
        config: {
          parisChannelId: null,
          equipesChannelId: null,
          parisMention: null,
          equipesMention: null,
        },
      });
    }

    const data = docSnap.data();
    return NextResponse.json({
      success: true,
      config: {
        parisChannelId: data?.parisChannelId || null,
        equipesChannelId: data?.equipesChannelId || null,
        parisMention: data?.parisMention || null,
        equipesMention: data?.equipesMention || null,
      },
    });
  } catch (error) {
    console.error(
      "[Discord Availability Config] Erreur lors de la récupération:",
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la récupération de la configuration",
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Sauvegarde la configuration des channels Discord pour les sondages
 */
export async function POST(req: Request) {
  try {
    // Valider l'origine de la requête pour prévenir les attaques CSRF
    if (!validateOrigin(req)) {
      return NextResponse.json(
        { success: false, error: "Invalid origin", message: "Requête non autorisée" },
        { status: 403 }
      );
    }

    // Valider le token CSRF pour le pattern Double-Submit Cookie
    if (!(await validateCSRFToken())) {
      return NextResponse.json(
        { success: false, error: "Invalid CSRF token", message: "Session expirée ou invalide" },
        { status: 403 }
      );
    }

    // Vérifier l'authentification
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    if (!decoded.email_verified) {
      return NextResponse.json(
        { success: false, error: "Email non vérifié" },
        { status: 403 }
      );
    }

    // Vérifier que l'utilisateur est admin
    const role = resolveRole(decoded.role as string | undefined);
    if (!hasAnyRole(role, [USER_ROLES.ADMIN])) {
      return NextResponse.json(
        { success: false, error: "Accès refusé - Admin uniquement" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { parisChannelId, equipesChannelId, parisMention, equipesMention } =
      body;

    // Validation
    if (
      parisChannelId !== null &&
      parisChannelId !== undefined &&
      typeof parisChannelId !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "parisChannelId doit être une chaîne ou null",
        },
        { status: 400 }
      );
    }

    if (
      equipesChannelId !== null &&
      equipesChannelId !== undefined &&
      typeof equipesChannelId !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "equipesChannelId doit être une chaîne ou null",
        },
        { status: 400 }
      );
    }

    if (
      parisMention !== null &&
      parisMention !== undefined &&
      typeof parisMention !== "string"
    ) {
      return NextResponse.json(
        { success: false, error: "parisMention doit être une chaîne ou null" },
        { status: 400 }
      );
    }

    if (
      equipesMention !== null &&
      equipesMention !== undefined &&
      typeof equipesMention !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "equipesMention doit être une chaîne ou null",
        },
        { status: 400 }
      );
    }

    await initializeFirebaseAdmin();
    const db = getFirestoreAdmin();
    const docRef = db.collection(COLLECTION_NAME).doc(DOCUMENT_ID);

    const dataToSave: Record<string, unknown> = {
      parisChannelId: parisChannelId || null,
      equipesChannelId: equipesChannelId || null,
      parisMention: parisMention || null,
      equipesMention: equipesMention || null,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: decoded.uid,
    };

    await docRef.set(dataToSave, { merge: true });

    return NextResponse.json({
      success: true,
      config: {
        parisChannelId: parisChannelId || null,
        equipesChannelId: equipesChannelId || null,
        parisMention: parisMention || null,
        equipesMention: equipesMention || null,
      },
    });
  } catch (error) {
    console.error(
      "[Discord Availability Config] Erreur lors de la sauvegarde:",
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la sauvegarde de la configuration",
      },
      { status: 500 }
    );
  }
}
