import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Test simple avec une seule équipe
    const teamId = "8551"; // SQY PING 16
    
    // Récupérer l'équipe
    const teamResponse = await fetch(`http://localhost:3000/api/teams`);
    const teamsData = await teamResponse.json();
    const team = teamsData.teams.find((t: any) => t.id === teamId);
    
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Récupérer les matchs de l'équipe
    const matchesResponse = await fetch(`http://localhost:3000/api/teams/${teamId}/matches`);
    const matchesData = await matchesResponse.json();
    const matches = matchesData.matches || [];

    res.status(200).json({
      success: true,
      data: {
        team: {
          id: team.id,
          name: team.name,
          division: team.division || "Division inconnue",
          players: [],
          coach: "",
          createdAt: team.createdAt ? new Date(team.createdAt) : new Date(),
          updatedAt: team.updatedAt ? new Date(team.updatedAt) : new Date(),
        },
        matches: matches,
      },
    });
  } catch (error) {
    console.error("Error testing equipes:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
