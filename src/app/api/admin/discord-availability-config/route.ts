export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";
import { hasAnyRole, USER_ROLES, resolveRole } from "@/lib/auth/roles";
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
        },
      });
    }

    const data = docSnap.data();
    return NextResponse.json({
      success: true,
      config: {
        parisChannelId: data?.parisChannelId || null,
        equipesChannelId: data?.equipesChannelId || null,
      },
    });
  } catch (error) {
    console.error(
      "[Discord Availability Config] Erreur lors de la récupération:",
      error
    );
    return NextResponse.json(
      { success: false, error: "Erreur lors de la récupération de la configuration" },
      { status: 500 }
    );
  }
}

/**
 * POST - Sauvegarde la configuration des channels Discord pour les sondages
 */
export async function POST(req: Request) {
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

    const body = await req.json();
    const { parisChannelId, equipesChannelId } = body;

    // Validation
    if (
      parisChannelId !== null &&
      parisChannelId !== undefined &&
      typeof parisChannelId !== "string"
    ) {
      return NextResponse.json(
        { success: false, error: "parisChannelId doit être une chaîne ou null" },
        { status: 400 }
      );
    }

    if (
      equipesChannelId !== null &&
      equipesChannelId !== undefined &&
      typeof equipesChannelId !== "string"
    ) {
      return NextResponse.json(
        { success: false, error: "equipesChannelId doit être une chaîne ou null" },
        { status: 400 }
      );
    }

    await initializeFirebaseAdmin();
    const db = getFirestoreAdmin();
    const docRef = db.collection(COLLECTION_NAME).doc(DOCUMENT_ID);

    const dataToSave: Record<string, unknown> = {
      parisChannelId: parisChannelId || null,
      equipesChannelId: equipesChannelId || null,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: decoded.uid,
    };

    await docRef.set(dataToSave, { merge: true });

    return NextResponse.json({
      success: true,
      config: {
        parisChannelId: parisChannelId || null,
        equipesChannelId: equipesChannelId || null,
      },
    });
  } catch (error) {
    console.error(
      "[Discord Availability Config] Erreur lors de la sauvegarde:",
      error
    );
    return NextResponse.json(
      { success: false, error: "Erreur lors de la sauvegarde de la configuration" },
      { status: 500 }
    );
  }
}

