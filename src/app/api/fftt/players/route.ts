import { NextResponse } from "next/server";
import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth/api-utils";
import { USER_ROLES } from "@/lib/auth/roles";
import type { Player } from "@/types";

export const GET = withAuth(async (req: Request) => {
  try {
    const clubCode = new URL(req.url).searchParams.get("clubCode");
    if (!clubCode) return NextResponse.json({ error: "Club code required" }, { status: 400 });
    const snap = await getFirestoreAdmin().collection("players").get();
    const players: Player[] = snap.docs.map(doc => {
      const data = doc.data();
      const toD = (v: unknown) => {
        if (v && typeof v === "object" && "toDate" in v) return (v as { toDate: () => Date }).toDate();
        return v instanceof Date ? v : new Date();
      };
      return { id: doc.id, ...data, createdAt: toD(data.createdAt), updatedAt: toD(data.updatedAt) } as Player;
    }).sort((a, b) => b.points - a.points);
    return NextResponse.json({ players, total: players.length, clubCode });
  } catch {
    return NextResponse.json({ error: "Failed to fetch players" }, { status: 500 });
  }
}, [USER_ROLES.ADMIN, USER_ROLES.COACH]);
