import {
  TeamComposition,
  TeamCompositionValidation,
  Player,
} from "@/types/team-management";
import { BurnoutCalculator } from "./burnout-calculator";
import { AvailabilityService } from "./availability-service";

export class TeamCompositionService {
  private burnoutCalculator = new BurnoutCalculator();
  private availabilityService = new AvailabilityService();

  /**
   * Crée une nouvelle composition d&apos;équipe
   */
  async createTeamComposition(
    teamId: string,
    date: string,
    playerIds: string[],
    players: Player[],
    matchHistory: any[] = []
  ): Promise<TeamCompositionValidation> {
    // Valider la composition selon les règles de brûlage
    const validation = this.burnoutCalculator.validateComposition(
      teamId,
      playerIds,
      players,
      matchHistory,
      [], // existingCompositions
      date
    );

    // Vérifier la disponibilité des joueurs
    for (const playerId of playerIds) {
      const player = players.find((p) => p.id === playerId);
      if (!player) continue;

      const isAvailable = await this.availabilityService.isPlayerAvailable(
        playerId,
        date,
        player.gender === "M" ? "masculin" : "feminin"
      );

      if (!isAvailable) {
        validation.violations.push({
          type: "PLAYER_LIMIT",
          message: `${player.firstName} ${player.name} n&apos;est pas disponible pour cette date`,
          severity: "ERROR",
          canOverride: true,
          details: {
            playerId,
            teamId,
            currentCount: 0,
            maxCount: 0,
            period: "journée",
          },
        });
        validation.isValid = false;
      }
    }

    // Si la validation est OK, créer la composition
    if (validation.isValid || validation.canProceed) {
      const composition: TeamComposition = {
        id: `comp_${teamId}_${date}_${Date.now()}`,
        teamId,
        date,
        players: playerIds,
        isConfirmed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.saveTeamComposition(composition);
    }

    return validation;
  }

  /**
   * Met à jour une composition d&apos;équipe existante
   */
  async updateTeamComposition(
    compositionId: string,
    playerIds: string[],
    players: Player[],
    matchHistory: any[] = []
  ): Promise<TeamCompositionValidation> {
    const existingComposition = await this.getTeamComposition(compositionId);
    if (!existingComposition) {
      throw new Error("Composition non trouvée");
    }

    const validation = this.burnoutCalculator.validateComposition(
      existingComposition.teamId,
      playerIds,
      players,
      matchHistory,
      [], // existingCompositions
      existingComposition.date
    );

    if (validation.isValid || validation.canProceed) {
      const updatedComposition: TeamComposition = {
        ...existingComposition,
        players: playerIds,
        updatedAt: new Date().toISOString(),
      };

      await this.saveTeamComposition(updatedComposition);
    }

    return validation;
  }

  /**
   * Confirme une composition d&apos;équipe
   */
  async confirmTeamComposition(compositionId: string): Promise<void> {
    const composition = await this.getTeamComposition(compositionId);
    if (!composition) {
      throw new Error("Composition non trouvée");
    }

    const confirmedComposition: TeamComposition = {
      ...composition,
      isConfirmed: true,
      updatedAt: new Date().toISOString(),
    };

    await this.saveTeamComposition(confirmedComposition);
  }

  /**
   * Récupère une composition d&apos;équipe
   */
  async getTeamComposition(
    _compositionId: string
  ): Promise<TeamComposition | null> {
    // TODO: Implémenter la récupération depuis Firestore
    return null;
  }

  /**
   * Récupère les compositions d&apos;une équipe pour une date
   */
  async getTeamCompositionForDate(
    _teamId: string,
    _date: string
  ): Promise<TeamComposition | null> {
    // TODO: Implémenter la récupération depuis Firestore
    return null;
  }

  /**
   * Récupère toutes les compositions d&apos;une équipe
   */
  async getTeamCompositions(_teamId: string): Promise<TeamComposition[]> {
    // TODO: Implémenter la récupération depuis Firestore
    return [];
  }

  /**
   * Sauvegarde une composition d&apos;équipe
   */
  private async saveTeamComposition(
    _composition: TeamComposition
  ): Promise<void> {
    // TODO: Implémenter la sauvegarde dans Firestore
  }

  /**
   * Génère des suggestions de composition basées sur les préférences et disponibilités
   */
  async generateCompositionSuggestions(
    _teamId: string,
    _date: string,
    players: Player[],
    maxPlayers: number = 4
  ): Promise<{
    suggested: string[];
    alternatives: string[][];
    reasons: string[];
  }> {
    const availablePlayers = players.filter(
      (player) => player.isActive && player.participation[_teamId]
    );

    // Filtrer par disponibilité
    const availableForDate = [];
    for (const player of availablePlayers) {
      const isAvailable = await this.availabilityService.isPlayerAvailable(
        player.id,
        _date,
        player.gender === "M" ? "masculin" : "feminin"
      );
      if (isAvailable) {
        availableForDate.push(player);
      }
    }

    // Trier par préférence (joueurs préférés en premier)
    const sortedPlayers = availableForDate.sort((a, b) => {
      const aPreferred =
        a.preferredTeams.masculine.includes(_teamId) ||
        a.preferredTeams.feminine.includes(_teamId);
      const bPreferred =
        b.preferredTeams.masculine.includes(_teamId) ||
        b.preferredTeams.feminine.includes(_teamId);

      if (aPreferred && !bPreferred) return -1;
      if (!aPreferred && bPreferred) return 1;
      return 0;
    });

    const suggested = sortedPlayers.slice(0, maxPlayers).map((p) => p.id);
    const alternatives = this.generateAlternativeCompositions(
      sortedPlayers,
      maxPlayers
    );

    const reasons = [];
    if (suggested.length < maxPlayers) {
      reasons.push(
        `Seulement ${suggested.length} joueurs disponibles sur ${maxPlayers} requis`
      );
    }
    if (suggested.length === 0) {
      reasons.push("Aucun joueur disponible pour cette date");
    }

    return {
      suggested,
      alternatives,
      reasons,
    };
  }

  /**
   * Génère des compositions alternatives
   */
  private generateAlternativeCompositions(
    players: Player[],
    maxPlayers: number
  ): string[][] {
    const alternatives: string[][] = [];

    // Générer quelques alternatives en variant l&apos;ordre
    for (let i = 1; i < Math.min(3, players.length); i++) {
      const alternative = players.slice(i, i + maxPlayers).map((p) => p.id);
      if (alternative.length === maxPlayers) {
        alternatives.push(alternative);
      }
    }

    return alternatives;
  }

  /**
   * Vérifie les conflits entre compositions d&apos;équipes
   */
  async checkCompositionConflicts(
    _teamId: string,
    _date: string,
    _playerIds: string[]
  ): Promise<{
    hasConflicts: boolean;
    conflicts: {
      playerId: string;
      conflictingTeam: string;
      message: string;
    }[];
  }> {
    // TODO: Implémenter la vérification des conflits
    // Un joueur ne peut pas être dans plusieurs équipes le même jour
    return {
      hasConflicts: false,
      conflicts: [],
    };
  }
}
