import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { initializeFirebaseAdmin, getFirestoreAdmin, adminAuth } from "@/lib/firebase-admin";
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
    // Initialiser Firebase Admin
    await initializeFirebaseAdmin();

    // Vérification d'authentification
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Authentification requise" },
        { status: 401 }
      );
    }

    try {
      const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
      if (!decoded.email_verified) {
        return NextResponse.json(
          { error: "Email non vérifié" },
          { status: 403 }
        );
      }
      // Pour cet endpoint qui expose l'ensemble des matchs du club,
      // on autorise tous les utilisateurs connectés avec un email vérifié (rôle PLAYER minimum).
    } catch (error) {
      console.error("[app/api/teams/matches] Session Verification Error:", error);
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

    const response = NextResponse.json(
      {
        teams: teamMatches,
        totalTeams: teamMatches.length,
        totalMatches: teamMatches.reduce((acc, entry) => acc + entry.total, 0),
      },
      { status: 200 }
    );

    // Protection contre le cache pour les données privées du club
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
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


