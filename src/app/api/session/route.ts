import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  const { idToken } = await req.json();
  if (!idToken)
    return NextResponse.json({ error: "Missing token" }, { status: 400 });

  // Vérification rapide du token
  const decoded = await adminAuth.verifyIdToken(idToken, true);
  if (!decoded.email_verified) {
    return NextResponse.json({ error: "Email non vérifié" }, { status: 403 });
  }

  const expiresIn = 14 * 24 * 60 * 60 * 1000; // 14 jours
  const sessionCookie = await adminAuth.createSessionCookie(idToken, {
    expiresIn,
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: "__session",
    value: sessionCookie,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(expiresIn / 1000),
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: "__session",
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}

