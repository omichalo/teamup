import { ChampionshipType } from "@/types";
import type { MatchesByTeamByPhase } from "./types";

export const calculateFutureBurnout = (
  matchesByTeamByPhase: MatchesByTeamByPhase,
  targetTeamNumber: number,
  _championshipType: ChampionshipType
): number | null => {
  void _championshipType;

  const futureMatchesByTeam = new Map<number, number>();
  if (matchesByTeamByPhase) {
    for (const [teamNumber, matchCount] of Object.entries(matchesByTeamByPhase)) {
      futureMatchesByTeam.set(parseInt(teamNumber, 10), matchCount);
    }
  }

  const currentCountInTargetTeam = futureMatchesByTeam.get(targetTeamNumber) || 0;
  futureMatchesByTeam.set(targetTeamNumber, currentCountInTargetTeam + 1);

  const allMatches: number[] = [];
  for (const [teamNumber, matchCount] of futureMatchesByTeam) {
    for (let i = 0; i < matchCount; i++) {
      allMatches.push(teamNumber);
    }
  }

  allMatches.sort((a, b) => a - b);
  return allMatches.length >= 2 ? allMatches[1] : null;
};

export const calculateFutureBurnoutParis = (
  matchesByTeamByPhase: MatchesByTeamByPhase,
  targetTeamNumber: number,
  _championshipType: ChampionshipType
): number | null => {
  void _championshipType;
  if (!matchesByTeamByPhase) return null;

  const futureMatchesByTeam = new Map<number, number>();
  for (const [teamNumber, matchCount] of Object.entries(matchesByTeamByPhase)) {
    futureMatchesByTeam.set(parseInt(teamNumber, 10), matchCount);
  }

  const currentCountInTargetTeam = futureMatchesByTeam.get(targetTeamNumber) || 0;
  futureMatchesByTeam.set(targetTeamNumber, currentCountInTargetTeam + 1);

  const teamNumbers = Array.from(futureMatchesByTeam.keys()).sort((a, b) => a - b);
  let highestBurnedTeam: number | null = null;

  for (let i = 0; i < teamNumbers.length; i++) {
    const currentTeamNumber = teamNumbers[i];
    for (let j = 0; j < i; j++) {
      const lowerTeamNumber = teamNumbers[j];
      const matchCountInLowerTeam = futureMatchesByTeam.get(lowerTeamNumber) || 0;
      if (matchCountInLowerTeam >= 3) {
        if (highestBurnedTeam === null || currentTeamNumber > highestBurnedTeam) {
          highestBurnedTeam = currentTeamNumber;
        }
        break;
      }
    }
  }

  return highestBurnedTeam;
};
