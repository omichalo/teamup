import {
  Player,
  TeamComposition,
  MatchHistory,
  BurnoutRule,
  BurnoutViolation,
  TeamCompositionValidation,
} from "@/types/team-management";

export class BurnoutCalculator {
  private rules: BurnoutRule[] = [
    {
      id: "player-team-limit",
      name: "Limite de participation par équipe",
      description:
        "Un joueur ne peut pas jouer plus de 2 fois dans une équipe de niveau supérieur",
      type: "TEAM_LIMIT",
      maxCount: 2,
      period: "SEASON",
      isActive: true,
    },
    {
      id: "foreign-players-limit",
      name: "Limite de joueurs étrangers",
      description: "Maximum 2 joueurs étrangers par équipe",
      type: "FOREIGN_LIMIT",
      maxCount: 2,
      period: "MATCH_DAY",
      isActive: true,
    },
    {
      id: "mutation-players-limit",
      name: "Limite de joueurs mutés",
      description: "Maximum 1 joueur muté par équipe",
      type: "MUTATION_LIMIT",
      maxCount: 1,
      period: "MATCH_DAY",
      isActive: true,
    },
  ];

  /**
   * Valide une composition d&apos;équipe selon les règles de brûlage
   */
  validateComposition(
    teamId: string,
    playerIds: string[],
    players: Player[],
    matchHistory: MatchHistory[],
    _existingCompositions: TeamComposition[],
    _date: string
  ): TeamCompositionValidation {
    const violations: BurnoutViolation[] = [];
    const warnings: BurnoutViolation[] = [];
    const suggestions: string[] = [];

    // Vérifier les règles pour chaque joueur
    for (const playerId of playerIds) {
      const player = players.find((p) => p.id === playerId);
      if (!player) continue;

      // Vérifier la limite de participation par équipe
      const teamParticipation = this.getPlayerTeamParticipation(
        playerId,
        teamId,
        matchHistory
      );
      const teamRule = this.rules.find((r) => r.type === "TEAM_LIMIT");

      if (teamRule && teamParticipation >= teamRule.maxCount) {
        violations.push({
          type: "TEAM_LIMIT",
          message: `${player.firstName} ${player.name} a déjà joué ${teamParticipation} fois dans cette équipe (limite: ${teamRule.maxCount})`,
          severity: "ERROR",
          canOverride: true,
          details: {
            playerId,
            teamId,
            currentCount: teamParticipation,
            maxCount: teamRule.maxCount,
            period: "saison",
          },
        });
      }

      // Vérifier si le joueur peut jouer dans une équipe de niveau inférieur
      if (
        this.hasPlayedInHigherLevelTeam(playerId, teamId, matchHistory, players)
      ) {
        warnings.push({
          type: "TEAM_LIMIT",
          message: `${player.firstName} ${player.name} a déjà joué dans une équipe de niveau supérieur`,
          severity: "WARNING",
          canOverride: true,
          details: {
            playerId,
            teamId,
            currentCount: 0,
            maxCount: 0,
            period: "saison",
          },
        });
      }
    }

    // Vérifier la limite de joueurs étrangers
    const foreignPlayers = playerIds.filter((id) => {
      const player = players.find((p) => p.id === id);
      return player?.nationality === "ETR";
    });

    const foreignRule = this.rules.find((r) => r.type === "FOREIGN_LIMIT");
    if (foreignRule && foreignPlayers.length > foreignRule.maxCount) {
      violations.push({
        type: "FOREIGN_LIMIT",
        message: `Trop de joueurs étrangers (${foreignPlayers.length}/${foreignRule.maxCount})`,
        severity: "ERROR",
        canOverride: true,
        details: {
          teamId,
          currentCount: foreignPlayers.length,
          maxCount: foreignRule.maxCount,
          period: "journée",
        },
      });
    }

    // Vérifier la limite de joueurs mutés
    const mutationRule = this.rules.find((r) => r.type === "MUTATION_LIMIT");
    if (mutationRule) {
      const mutationCount = this.getMutationPlayersCount(
        playerIds,
        players,
        _date
      );
      if (mutationCount > mutationRule.maxCount) {
        violations.push({
          type: "MUTATION_LIMIT",
          message: `Trop de joueurs mutés (${mutationCount}/${mutationRule.maxCount})`,
          severity: "ERROR",
          canOverride: true,
          details: {
            teamId,
            currentCount: mutationCount,
            maxCount: mutationRule.maxCount,
            period: "journée",
          },
        });
      }
    }

    // Générer des suggestions
    if (violations.length > 0) {
      suggestions.push(
        "Considérez remplacer les joueurs en violation des règles"
      );
      suggestions.push("Utilisez le contournement forcé si nécessaire");
    }

    const canProceed = violations.every((v) => v.canOverride);
    const isValid = violations.length === 0;

    return {
      isValid,
      violations,
      warnings,
      canProceed,
      suggestions,
    };
  }

  /**
   * Calcule le nombre de fois qu&apos;un joueur a joué dans une équipe
   */
  private getPlayerTeamParticipation(
    playerId: string,
    teamId: string,
    matchHistory: MatchHistory[]
  ): number {
    return matchHistory.filter(
      (match) => match.playerId === playerId && match.teamId === teamId
    ).length;
  }

  /**
   * Vérifie si un joueur a joué dans une équipe de niveau supérieur
   */
  private hasPlayedInHigherLevelTeam(
    _playerId: string,
    currentTeamId: string,
    _matchHistory: MatchHistory[],
    players: Player[]
  ): boolean {
    const currentTeam = players.find((p) => p.id === currentTeamId);
    if (!currentTeam) return false;

    // Cette fonction retourne toujours false car la logique de vérification
    // du niveau d'équipe n'est pas implémentée
    return false;
  }

  /**
   * Calcule le nombre de joueurs mutés dans une composition
   */
  private getMutationPlayersCount(
    playerIds: string[],
    players: Player[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _date: string
  ): number {
    // Logique pour déterminer les joueurs mutés
    // Pour l&apos;instant, on considère qu&apos;un joueur est muté s&apos;il n&apos;est pas dans ses équipes préférées
    let mutationCount = 0;

    for (const playerId of playerIds) {
      const player = players.find((p) => p.id === playerId);
      if (!player) continue;

      // Vérifier si le joueur est dans ses équipes préférées
      const isInPreferredTeams =
        player.preferredTeams.masculine.includes(playerId) ||
        player.preferredTeams.feminine.includes(playerId);

      if (!isInPreferredTeams) {
        mutationCount++;
      }
    }

    return mutationCount;
  }

  /**
   * Obtient le statut de brûlage d&apos;un joueur pour une équipe
   */
  getPlayerBurnoutStatus(
    playerId: string,
    teamId: string,
    matchHistory: MatchHistory[],
    players: Player[]
  ): { canPlay: boolean; reason?: string } {
    const teamParticipation = this.getPlayerTeamParticipation(
      playerId,
      teamId,
      matchHistory
    );
    const teamRule = this.rules.find((r) => r.type === "TEAM_LIMIT");

    if (teamRule && teamParticipation >= teamRule.maxCount) {
      return {
        canPlay: false,
        reason: `A déjà joué ${teamParticipation} fois dans cette équipe (limite: ${teamRule.maxCount})`,
      };
    }

    if (
      this.hasPlayedInHigherLevelTeam(playerId, teamId, matchHistory, players)
    ) {
      return {
        canPlay: true,
        reason: "A joué dans une équipe de niveau supérieur",
      };
    }

    return { canPlay: true };
  }
}
