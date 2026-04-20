import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { initializeFirebaseAdmin, getFirestoreAdmin, adminAuth } from "@/lib/firebase-admin";
import { hasAnyRole, USER_ROLES, resolveRole } from "@/lib/auth/roles";
import {
  getTeams,
  getTeamMatches,
  TeamMatch,
} from "@/lib/server/team-matches";

interface TeamMatchSerialized extends Omit<TeamMatch, "date" | "createdAt" | "updatedAt"> {
  date: string;
  createdAt: string;
  updatedAt: string;
}

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Authentification requise" },
        { status: 401 }
      );
    }

    await initializeFirebaseAdmin();

    try {
      const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
      if (!decoded.email_verified) {
        return NextResponse.json(
          { error: "Email non vérifié" },
          { status: 403 }
        );
      }

      // Vérifier que l'utilisateur est admin ou coach pour accéder aux matchs
      const role = resolveRole(decoded.role as string | undefined);
      if (!hasAnyRole(role, [USER_ROLES.ADMIN, USER_ROLES.COACH])) {
        return NextResponse.json(
          { error: "Accès refusé" },
          { status: 403 }
        );
      }
    } catch (error) {
      console.error("[app/api/teams/matches] Session verification error:", error);
      return NextResponse.json(
        { error: "Session invalide ou expirée" },
        { status: 401 }
      );
    }

    const firestore = getFirestoreAdmin();

    const teams = await getTeams(firestore);

    const { searchParams } = new URL(req.url);
    const teamIdsParam = searchParams.get("teamIds");

    let filteredTeams = teams;

    if (teamIdsParam && teamIdsParam.trim().length > 0) {
      const requestedIds = teamIdsParam
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);

      filteredTeams = teams.filter((team) => requestedIds.includes(team.id));
    }

    const teamMatches = await Promise.all(
      filteredTeams.map(async (team) => {
        const matches = await getTeamMatches(firestore, team.id);
        // Convertir les dates en ISO strings pour la sérialisation JSON
        const matchesWithISODates: TeamMatchSerialized[] = matches.map((match) => {
          const date = match.date instanceof Date ? match.date.toISOString() : new Date().toISOString();
          const createdAt = match.createdAt instanceof Date ? match.createdAt.toISOString() : new Date().toISOString();
          const updatedAt = match.updatedAt instanceof Date ? match.updatedAt.toISOString() : new Date().toISOString();
          return {
            ...match,
            date,
            createdAt,
            updatedAt,
          };
        });
        return {
          team,
          matches: matchesWithISODates,
          total: matchesWithISODates.length,
        };
      })
    );

    const res = NextResponse.json(
      {
        teams: teamMatches,
        totalTeams: teamMatches.length,
        totalMatches: teamMatches.reduce((acc, entry) => acc + entry.total, 0),
      },
      { status: 200 }
    );

    // Empêcher la mise en cache des données privées
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");

    return res;
  } catch (error) {
    console.error("[app/api/teams/matches] Firestore Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch teams matches",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


