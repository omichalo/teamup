import { NextResponse } from "next/server";
import { getFirestoreAdmin } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth/api-utils";
import { USER_ROLES } from "@/lib/auth/roles";
import { getTeams, getTeamMatches } from "@/lib/server/team-matches";

export const GET = withAuth(async (req: Request) => {
  try {
    const db = getFirestoreAdmin();
    const teams = await getTeams(db);
    const ids = new URL(req.url).searchParams.get("teamIds")?.split(",").map(id => id.trim()).filter(Boolean);
    const filtered = ids ? teams.filter(t => ids.includes(t.id)) : teams;
    const teamMatches = await Promise.all(filtered.map(async team => {
      const ms = await getTeamMatches(db, team.id);
      const fmt = (d: unknown) => (d instanceof Date ? d : new Date()).toISOString();
      return { team, matches: ms.map(m => ({ ...m, date: fmt(m.date), createdAt: fmt(m.createdAt), updatedAt: fmt(m.updatedAt) })), total: ms.length };
    }));
    return NextResponse.json({ teams: teamMatches, totalTeams: teamMatches.length, totalMatches: teamMatches.reduce((acc, e) => acc + e.total, 0) });
  } catch {
    return NextResponse.json({ error: "Failed to fetch matches" }, { status: 500 });
  }
}, [USER_ROLES.ADMIN, USER_ROLES.COACH]);
