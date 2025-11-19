import {
  Player,
  BurnRecord,
  CompositionValidation,
  ValidationError,
} from "@/types";

export class BrulageService {
  private burnRecords: BurnRecord[] = [];
  private players: Player[] = [];

  constructor(burnRecords: BurnRecord[], players: Player[]) {
    this.burnRecords = burnRecords;
    this.players = players;
  }

  /**
   * Valide une composition selon les règles FFTT
   */
  validateComposition(
    composition: { A?: string; B?: string; C?: string; D?: string },
    teamNumber: number,
    _journee: number,
    phase: string
  ): CompositionValidation {
    const errors: ValidationError[] = [];
    const playerIds = Object.values(composition).filter(Boolean) as string[];

    // Vérifier que tous les joueurs existent
    const players = this.players.filter((p) => playerIds.includes(p.id));
    if (players.length !== playerIds.length) {
      errors.push({
        type: "burn",
        message: "Un ou plusieurs joueurs n&apos;existent pas",
      });
      return { isValid: false, errors };
    }

    // 1. Vérifier le brûlage (règle principale)
    const burnErrors = this.validateBurnRules(
      players,
      teamNumber,
      _journee,
      phase
    );
    errors.push(...burnErrors);

    // 2. Vérifier les quotas féminins (max 2 par équipe)
    const femaleErrors = this.validateFemaleQuota(players);
    errors.push(...femaleErrors);

    // 3. Vérifier les quotas étrangers (max 1 par équipe)
    const foreignErrors = this.validateForeignQuota(players);
    errors.push(...foreignErrors);

    // 4. Vérifier l&apos;ordre des points (décroissant)
    const rankingErrors = this.validateRankingOrder(players, composition);
    errors.push(...rankingErrors);

    // 5. Vérifier les quotas jour 2 (joueurs d&apos;équipes inférieures)
    if (_journee === 2) {
      const day2Errors = this.validateDay2Quota(players, teamNumber);
      errors.push(...day2Errors);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Vérifie les règles de brûlage
   */
  private validateBurnRules(
    players: Player[],
    teamNumber: number,
    _journee: number,
    phase: string
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const player of players) {
      const burnCount = this.getBurnCount(player.id, phase);

      // Un joueur ne peut pas jouer s&apos;il a déjà 2 rencontres dans la phase
      if (burnCount >= 2) {
        errors.push({
          type: "burn",
          message: `${player.firstName} ${player.lastName} a déjà joué 2 rencontres cette phase`,
          playerId: player.id,
        });
        continue;
      }

      // Vérifier qu&apos;un joueur brûlé ne peut pas descendre dans une équipe supérieure
      if (burnCount > 0) {
        const hasPlayedInLowerTeam = this.hasPlayedInLowerTeam(
          player.id,
          teamNumber,
          phase
        );
        if (hasPlayedInLowerTeam) {
          errors.push({
            type: "burn",
            message: `${player.firstName} ${player.lastName} ne peut pas jouer en équipe ${teamNumber} car il a déjà joué dans une équipe inférieure`,
            playerId: player.id,
            teamNumber,
          });
        }
      }
    }

    return errors;
  }

  /**
   * Vérifie le quota féminin (max 2 par équipe)
   */
  private validateFemaleQuota(players: Player[]): ValidationError[] {
    const femaleCount = players.filter((p) => p.isFemale).length;

    if (femaleCount > 2) {
      return [
        {
          type: "quota_female",
          message: `Trop de joueuses dans l&apos;équipe (${femaleCount}/2 maximum)`,
        },
      ];
    }

    return [];
  }

  /**
   * Vérifie le quota étranger (max 1 par équipe)
   */
  private validateForeignQuota(players: Player[]): ValidationError[] {
    const foreignCount = players.filter((p) => p.isForeign).length;

    if (foreignCount > 1) {
      return [
        {
          type: "quota_foreign",
          message: `Trop de joueurs étrangers dans l&apos;équipe (${foreignCount}/1 maximum)`,
        },
      ];
    }

    return [];
  }

  /**
   * Vérifie l&apos;ordre des points (décroissant)
   */
  private validateRankingOrder(
    players: Player[],
    composition: { A?: string; B?: string; C?: string; D?: string }
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Trier les joueurs par points décroissants
    // const sortedPlayers = [...players].sort((a, b) => b.points - a.points);

    // Vérifier l&apos;ordre dans la composition
    const positions = ["A", "B", "C", "D"] as const;
    for (let i = 0; i < positions.length - 1; i++) {
      const posA = positions[i];
      const posB = positions[i + 1];
      const playerAId = composition[posA];
      const playerBId = composition[posB];

      if (playerAId && playerBId) {
        const playerA = players.find((p) => p.id === playerAId);
        const playerB = players.find((p) => p.id === playerBId);

        if (playerA && playerB && playerA.points < playerB.points) {
          errors.push({
            type: "ranking_order",
            message: `L&apos;ordre des points n&apos;est pas respecté: ${playerA.firstName} ${playerA.lastName} (${playerA.points} pts) devrait être après ${playerB.firstName} ${playerB.lastName} (${playerB.points} pts)`,
          });
        }
      }
    }

    return errors;
  }

  /**
   * Vérifie les quotas jour 2 (joueurs d&apos;équipes inférieures)
   */
  private validateDay2Quota(
    players: Player[],
    teamNumber: number
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Compter les joueurs venant d&apos;équipes inférieures
    const playersFromLowerTeams = players.filter((player) => {
      if (!player.teamNumber) return false;
      return player.teamNumber < teamNumber;
    });

    const quota = teamNumber <= 4 ? 1 : 2; // 1 pour équipes 1-4, 2 pour équipes 5-6

    if (playersFromLowerTeams.length > quota) {
      errors.push({
        type: "day2_quota",
        message: `Trop de joueurs d&apos;équipes inférieures (${playersFromLowerTeams.length}/${quota} maximum pour l&apos;équipe ${teamNumber})`,
      });
    }

    return errors;
  }

  /**
   * Retourne le nombre de rencontres jouées par un joueur dans une phase
   */
  getBurnCount(playerId: string, phase: string): number {
    return this.burnRecords.filter(
      (record) => record.playerId === playerId && record.phase === phase
    ).length;
  }

  /**
   * Vérifie si un joueur a joué dans une équipe de numéro inférieur
   */
  private hasPlayedInLowerTeam(
    playerId: string,
    currentTeamNumber: number,
    phase: string
  ): boolean {
    const playerRecords = this.burnRecords.filter(
      (record) => record.playerId === playerId && record.phase === phase
    );

    return playerRecords.some(
      (record) => record.teamNumber < currentTeamNumber
    );
  }

  /**
   * Retourne la liste des joueurs disponibles pour une équipe et une journée
   */
  getAvailablePlayers(
    teamNumber: number,
    _journee: number,
    phase: string,
    unavailablePlayerIds: string[] = []
  ): Player[] {
    return this.players
      .filter((player) => {
        // Exclure les joueurs indisponibles
        if (unavailablePlayerIds.includes(player.id)) {
          return false;
        }

        // Vérifier le brûlage
        const burnCount = this.getBurnCount(player.id, phase);
        if (burnCount >= 2) {
          return false;
        }

        // Vérifier qu&apos;un joueur brûlé ne peut pas descendre
        if (burnCount > 0) {
          const hasPlayedInLowerTeam = this.hasPlayedInLowerTeam(
            player.id,
            teamNumber,
            phase
          );
          if (hasPlayedInLowerTeam) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => b.points - a.points); // Trier par points décroissants
  }

  /**
   * Ajoute un enregistrement de brûlage
   */
  addBurnRecord(
    playerId: string,
    teamNumber: number,
    _journee: number,
    phase: string,
    matchId: string
  ): BurnRecord {
    const burnRecord: Omit<BurnRecord, "id" | "createdAt"> = {
      playerId,
      teamNumber,
      journee: _journee,
      phase,
      matchId,
    };

    // Ajouter à la liste locale
    const newRecord: BurnRecord = {
      ...burnRecord,
      id: `temp_${Date.now()}`,
      createdAt: new Date(),
    };

    this.burnRecords.push(newRecord);
    return newRecord;
  }

  /**
   * Remet à zéro le brûlage pour une phase
   */
  resetBurnForPhase(phase: string): void {
    this.burnRecords = this.burnRecords.filter(
      (record) => record.phase !== phase
    );
  }

  /**
   * Retourne les statistiques de brûlage pour un joueur
   */
  getPlayerBurnStats(playerId: string): {
    totalMatches: number;
    currentPhaseMatches: number;
    canPlayInTeam: (teamNumber: number) => boolean;
  } {
    const allMatches = this.burnRecords.filter(
      (record) => record.playerId === playerId
    );
    const currentPhaseMatches = allMatches.length; // Simplification pour l&apos;exemple

    return {
      totalMatches: allMatches.length,
      currentPhaseMatches,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      canPlayInTeam: (_teamNumber: number) => {
        const burnCount = this.getBurnCount(playerId, "current"); // Simplification
        return burnCount < 2;
      },
    };
  }
}
