import {
  Player,
  PlayerWithAvailability,
  Availability,
  MatchHistory,
  PlayerStats,
} from "@/types/team-management";
import { BurnoutCalculator } from "./burnout-calculator";

export class PlayerService {
  private burnoutCalculator = new BurnoutCalculator();

  /**
   * Récupère tous les joueurs actifs du club
   */
  async getActivePlayers(): Promise<Player[]> {
    // TODO: Implémenter la récupération depuis Firestore
    // Pour l&apos;instant, retourner des données de test
    return [
      {
        id: "1",
        name: "Dupont",
        firstName: "Jean",
        license: "123456",
        typeLicence: "T",
        gender: "M",
        nationality: "FR",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        preferredTeams: {
          masculine: ["team1", "team2"],
          feminine: [],
        },
        participation: {
          team1: true,
          team2: true,
          team3: false,
        },
      },
      {
        id: "2",
        name: "Martin",
        firstName: "Marie",
        license: "123457",
        typeLicence: "T",
        gender: "F",
        nationality: "FR",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        preferredTeams: {
          masculine: [],
          feminine: ["team1f", "team2f"],
        },
        participation: {
          team1f: true,
          team2f: true,
        },
      },
    ];
  }

  /**
   * Met à jour la participation d&apos;un joueur au championnat
   */
  async updatePlayerParticipation(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _playerId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _teamId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _isParticipating: boolean
  ): Promise<void> {
    // TODO: Implémenter la mise à jour dans Firestore
  }

  /**
   * Met à jour les équipes préférées d&apos;un joueur
   */
  async updatePlayerPreferredTeams(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _playerId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _preferredTeams: { masculine: string[]; feminine: string[] }
  ): Promise<void> {
    // TODO: Implémenter la mise à jour dans Firestore
  }

  /**
   * Récupère un joueur avec ses disponibilités et historique
   */
  async getPlayerWithAvailability(
    playerId: string
  ): Promise<PlayerWithAvailability | null> {
    const players = await this.getActivePlayers();
    const player = players.find((p) => p.id === playerId);

    if (!player) return null;

    // TODO: Récupérer les vraies données depuis Firestore
    const availability: Availability[] = [];
    const matchHistory: MatchHistory[] = [];

    return {
      ...player,
      availability,
      matchHistory,
    };
  }

  /**
   * Calcule les statistiques d&apos;un joueur
   */
  async getPlayerStats(playerId: string): Promise<PlayerStats> {
    const player = await this.getPlayerWithAvailability(playerId);
    if (!player) {
      throw new Error("Joueur non trouvé");
    }

    const totalMatches = player.matchHistory.length;
    const matchesByTeam: { [teamId: string]: number } = {};

    player.matchHistory.forEach((match) => {
      matchesByTeam[match.teamId] = (matchesByTeam[match.teamId] || 0) + 1;
    });

    const lastPlayed =
      player.matchHistory.length > 0
        ? player.matchHistory[player.matchHistory.length - 1].date
        : null;

    // Calculer le statut de brûlage pour chaque équipe
    const burnoutStatus: {
      [teamId: string]: { canPlay: boolean; reason?: string };
    } = {};
    const teams = ["team1", "team2", "team3"]; // TODO: Récupérer les vraies équipes

    for (const teamId of teams) {
      burnoutStatus[teamId] = this.burnoutCalculator.getPlayerBurnoutStatus(
        playerId,
        teamId,
        player.matchHistory,
        [player]
      );
    }

    return {
      playerId,
      totalMatches,
      matchesByTeam,
      lastPlayed,
      burnoutStatus,
    };
  }

  /**
   * Recherche des joueurs par nom ou prénom
   */
  async searchPlayers(query: string): Promise<Player[]> {
    const players = await this.getActivePlayers();
    const lowerQuery = query.toLowerCase();

    return players.filter(
      (player) =>
        player.name.toLowerCase().includes(lowerQuery) ||
        player.firstName.toLowerCase().includes(lowerQuery) ||
        player.license.includes(query)
    );
  }

  /**
   * Filtre les joueurs par critères
   */
  async filterPlayers(filters: {
    gender?: "M" | "F";
    nationality?: "FR" | "ETR";
    isActive?: boolean;
    teamId?: string;
  }): Promise<Player[]> {
    let players = await this.getActivePlayers();

    if (filters.gender) {
      players = players.filter((p) => p.gender === filters.gender);
    }

    if (filters.nationality) {
      players = players.filter((p) => p.nationality === filters.nationality);
    }

    if (filters.isActive !== undefined) {
      players = players.filter((p) => p.isActive === filters.isActive);
    }

    if (filters.teamId) {
      players = players.filter((p) => p.participation[filters.teamId!]);
    }

    return players;
  }
}
