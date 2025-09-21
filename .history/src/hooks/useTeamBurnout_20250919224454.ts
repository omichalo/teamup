import { useState, useEffect } from 'react';

export interface BurnoutInfo {
  playerLicence: string;
  playerName: string;
  teamId: string;
  teamName: string;
  matchesPlayed: number;
  lastMatchDate: string;
  isAtRisk: boolean;
  riskReason?: string;
}

export interface BurnoutConditions {
  maxMatchesPerPlayer: number;
  maxConsecutiveMatches: number;
  minDaysBetweenMatches: number;
}

export interface TeamBurnoutData {
  teamId: string;
  teamName: string;
  totalPlayers: number;
  atRiskPlayers: number;
  safePlayers: number;
  players: {
    atRisk: BurnoutInfo[];
    safe: BurnoutInfo[];
  };
  conditions: BurnoutConditions;
}

export const useTeamBurnout = (teamId: string | null) => {
  const [data, setData] = useState<TeamBurnoutData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) {
      setData(null);
      return;
    }

    const fetchBurnoutData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/teams/${teamId}/burnout`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success) {
          setData(result.data);
        } else {
          throw new Error(result.error || 'Failed to fetch burnout data');
        }
      } catch (err) {
        console.error('Error fetching team burnout data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchBurnoutData();
  }, [teamId]);

  return { data, loading, error, refetch: () => teamId && fetchBurnoutData() };
};
