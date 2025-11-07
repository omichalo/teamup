import { NextApiResponse } from "next";
import { withOptionalAuth, AuthenticatedRequest } from "@/lib/auth-middleware";
import {
  getFirestoreAdmin,
  initializeFirebaseAdmin,
} from "@/lib/firebase-admin";
import { getTeamMatches } from "@/lib/server/team-matches";

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { teamId } = req.query;

  if (!teamId || typeof teamId !== "string") {
    return res.status(400).json({ error: "Team ID parameter is required" });
  }

  try {
    await initializeFirebaseAdmin();
    const firestore = getFirestoreAdmin();
    const matches = await getTeamMatches(firestore, teamId);

    console.log(
      `📊 ${matches.length} matchs récupérés pour l'équipe ${teamId}`
    );

    res.status(200).json({
      teamId,
      matches,
      total: matches.length,
    });
  } catch (error) {
    console.error("Firestore Error:", error);
    res.status(500).json({
      error: "Failed to fetch team matches",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default withOptionalAuth(handler);

