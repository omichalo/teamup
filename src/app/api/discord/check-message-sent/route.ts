import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();

export async function GET(req: Request) {
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

    await adminAuth.verifySessionCookie(sessionCookie, true);

    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");
    const journee = searchParams.get("journee");
    const phase = searchParams.get("phase");

    if (!teamId || !journee || !phase) {
      return NextResponse.json(
        { success: false, error: "teamId, journee et phase sont requis" },
        { status: 400 }
      );
    }

    // Vérifier si un message a déjà été envoyé pour ce match
    const messageRef = db
      .collection("discordMessages")
      .where("teamId", "==", teamId)
      .where("journee", "==", parseInt(journee, 10))
      .where("phase", "==", phase)
      .limit(1);

    const snapshot = await messageRef.get();
    const hasBeenSent = !snapshot.empty;

    if (hasBeenSent) {
      const messageData = snapshot.docs[0].data();
      return NextResponse.json({
        success: true,
        sent: true,
        sentAt: messageData.sentAt?.toDate?.()?.toISOString() || messageData.sentAt,
        customMessage: messageData.customMessage || "",
      });
    }

    // Même si le message n'a pas été envoyé, vérifier s'il y a un message personnalisé sauvegardé
    const messageId = `${teamId}_${journee}_${phase}`;
    const messageDoc = await db.collection("discordMessages").doc(messageId).get();
    
    if (messageDoc.exists) {
      const messageData = messageDoc.data();
      return NextResponse.json({
        success: true,
        sent: false,
        customMessage: messageData?.customMessage || "",
      });
    }

    return NextResponse.json({ success: true, sent: false, customMessage: "" });
  } catch (error) {
    console.error("[Discord] Erreur lors de la vérification:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la vérification" },
      { status: 500 }
    );
  }
}

