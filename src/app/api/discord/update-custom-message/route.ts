import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();

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
    const role = decoded.role || "player";
    
    // Seuls les admins et coaches peuvent modifier les messages
    if (role !== "admin" && role !== "coach") {
      return NextResponse.json(
        { success: false, error: "Accès refusé" },
        { status: 403 }
      );
    }

    const { teamId, journee, phase, customMessage } = await req.json();

    if (!teamId || journee === undefined || !phase) {
      return NextResponse.json(
        { success: false, error: "teamId, journee et phase sont requis" },
        { status: 400 }
      );
    }

    // Sauvegarder le message personnalisé
    const messageId = `${teamId}_${journee}_${phase}`;
    const messageDoc = {
      teamId,
      journee: parseInt(journee, 10),
      phase,
      customMessage: customMessage || "",
      updatedAt: new Date(),
      updatedBy: decoded.uid,
    };

    await db.collection("discordMessages").doc(messageId).set(messageDoc, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Discord] Erreur lors de la mise à jour:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la mise à jour" },
      { status: 500 }
    );
  }
}

