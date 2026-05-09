export type GlobalStatsAlertType = "warning" | "error" | "info" | "success";

export interface GlobalStatsData {
  overview: {
    totalPlayers: number;
    totalTeams: number;
    totalMatches: number;
    totalChampionships: number;
    activePlayers: number;
    inactivePlayers: number;
    upcomingMatches: number;
    completedMatches: number;
  };
  trends: {
    playerGrowth: number;
    teamGrowth: number;
    matchGrowth: number;
    championshipGrowth: number;
  };
  performance: {
    averageMatchDuration: number;
    averagePlayerRating: number;
    averageTeamRating: number;
    winRate: number;
    participationRate: number;
  };
  distribution: {
    playersByGender: { male: number; female: number };
    playersByAge: { junior: number; senior: number; veteran: number };
    teamsByDivision: Record<string, number>;
    matchesByMonth: Record<string, number>;
  };
  alerts: {
    type: GlobalStatsAlertType;
    message: string;
    count: number;
  }[];
}
