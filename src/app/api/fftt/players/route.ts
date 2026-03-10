import { NextResponse } from "next/server";
import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { verifyApiAuth } from "@/lib/auth/api-auth";
import { USER_ROLES } from "@/lib/auth/roles";
import type { Player } from "@/types";

export async function GET(req: Request) {
  try {
    const auth = await verifyApiAuth([USER_ROLES.ADMIN, USER_ROLES.COACH]);
    if (!auth.success) return auth.response;

    const { searchParams } = new URL(req.url);
    const clubCode = searchParams.get("clubCode");
    if (!clubCode) return NextResponse.json({ error: "Club code required" }, { status: 400 });

    const playersSnapshot = await getFirestoreAdmin().collection("players").get();
    const players: Player[] = [];
    playersSnapshot.forEach((doc) => {
      const data = doc.data();
      const toDate = (v: unknown) =>
        v instanceof Date ? v : (v && typeof v === "object" && "toDate" in v && typeof v.toDate === "function" ? v.toDate() : new Date());
      players.push({
        id: doc.id,
        ...(data as Partial<Player>),
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      } as Player);
    });

    players.sort((a, b) => b.points - a.points);
    const res = NextResponse.json({ players, total: players.length, clubCode }, { status: 200 });

    // 🛡️ Sentinel: Prevent caching of sensitive data
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    return res;
  } catch (error) {
    console.error("[api/fftt/players] Error:", error);
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}
