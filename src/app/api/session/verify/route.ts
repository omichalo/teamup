import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, getFirestoreAdmin } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get("__session")?.value;

  if (!cookie) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  try {
    const decoded = await adminAuth.verifySessionCookie(cookie, true);
    if (!decoded.email_verified) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // Récupérer les informations utilisateur depuis Firestore
    const db = getFirestoreAdmin();
    const userDoc = await db.collection("users").doc(decoded.uid).get();

    if (userDoc.exists) {
      const userData = userDoc.data();
      
      // Convertir le timestamp Firestore en Date si présent
      let coachRequestUpdatedAt: string | null = null;
      if (userData?.coachRequestUpdatedAt) {
        if (userData.coachRequestUpdatedAt.toDate) {
          // Timestamp Firestore
          coachRequestUpdatedAt = userData.coachRequestUpdatedAt.toDate().toISOString();
        } else if (userData.coachRequestUpdatedAt instanceof Date) {
          // Déjà une Date
          coachRequestUpdatedAt = userData.coachRequestUpdatedAt.toISOString();
        } else if (typeof userData.coachRequestUpdatedAt === "string") {
          // Déjà une string ISO
          coachRequestUpdatedAt = userData.coachRequestUpdatedAt;
        }
      }
      
      const res = NextResponse.json({
        user: {
          uid: decoded.uid,
          email: decoded.email || userData?.email,
          role: userData?.role || decoded.role || "player",
          coachRequestStatus: userData?.coachRequestStatus || decoded.coachRequestStatus || "none",
          coachRequestMessage: userData?.coachRequestMessage || null,
          coachRequestUpdatedAt,
        },
      });
      res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.headers.set("Pragma", "no-cache");
      res.headers.set("Expires", "0");
      return res;
    }

    // Si le document n'existe pas, retourner les données du token
    const res = NextResponse.json({
      user: {
        uid: decoded.uid,
        email: decoded.email,
        role: decoded.role || "player",
        coachRequestStatus: decoded.coachRequestStatus || "none",
        coachRequestMessage: null,
        coachRequestUpdatedAt: null,
      },
    });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    return res;
  } catch (error) {
    console.error("[session/verify] Error:", error);
    const res = NextResponse.json({ user: null }, { status: 200 });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    return res;
  }
}

