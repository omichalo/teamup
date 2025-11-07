import { NextApiResponse } from "next";
import { withOptionalAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import {
  getFirestoreAdmin,
  initializeFirebaseAdmin,
} from "@/lib/firebase-admin";
import {
  getTeams,
  getTeamMatches,
  TeamSummary,
  TeamMatch,
} from "@/lib/server/team-matches";

interface TeamMatchesResponse {
  team: TeamSummary;
  matches: TeamMatch[];
  total: number;
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await initializeFirebaseAdmin();
    const firestore = getFirestoreAdmin();

    const teams = await getTeams(firestore);

    const { teamIds } = req.query;
    let filteredTeams = teams;

    if (typeof teamIds === "string" && teamIds.trim().length > 0) {
      const requestedIds = teamIds
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);

      filteredTeams = teams.filter((team) => requestedIds.includes(team.id));
    }

    const teamMatches = await Promise.all(
      filteredTeams.map(async (team) => {
        const matches = await getTeamMatches(firestore, team.id);
        return {
          team,
          matches,
          total: matches.length,
        } satisfies TeamMatchesResponse;
      })
    );

    res.status(200).json({
      teams: teamMatches,
      totalTeams: teamMatches.length,
      totalMatches: teamMatches.reduce((acc, entry) => acc + entry.total, 0),
    });
  } catch (error) {
    console.error("Firestore Error:", error);
    res.status(500).json({
      error: "Failed to fetch teams matches",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default withOptionalAuth(handler);
