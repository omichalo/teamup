import type { NextRequest } from "next/server";
import { initializeFirebaseAdmin, getFirestoreAdmin } from "@/lib/firebase-admin";
import {
  getTeams,
  getTeamMatches,
  TeamMatch,
} from "@/lib/server/team-matches";
import { createSecureResponse } from "@/lib/api/response-utils";
import { handleApiError } from "@/lib/api/error-handler";

interface TeamMatchSerialized extends Omit<TeamMatch, "date" | "createdAt" | "updatedAt"> {
  date: string;
  createdAt: string;
  updatedAt: string;
}

export async function GET(req: NextRequest) {
  try {
    await initializeFirebaseAdmin();
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

    return createSecureResponse(
      {
        teams: teamMatches,
        totalTeams: teamMatches.length,
        totalMatches: teamMatches.reduce((acc, entry) => acc + entry.total, 0),
      },
      200
    );
  } catch (error) {
    return handleApiError(error, {
      context: "app/api/teams/matches",
      defaultMessage: "Failed to fetch teams matches",
    });
  }
}


