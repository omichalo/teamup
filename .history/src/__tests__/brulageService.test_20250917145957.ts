import { BrulageService } from '@/services/brulageService';
import { Player, BurnRecord } from '@/types';

describe('BrulageService', () => {
  let brulageService: BrulageService;
  let mockPlayers: Player[];
  let mockBurnRecords: BurnRecord[];

  beforeEach(() => {
    mockPlayers = [
      {
        id: '1',
        ffttId: '12345',
        firstName: 'Jean',
        lastName: 'Dupont',
        points: 1200,
        ranking: 150,
        isForeign: false,
        isTransferred: false,
        isFemale: false,
        teamNumber: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        ffttId: '12346',
        firstName: 'Marie',
        lastName: 'Martin',
        points: 1100,
        ranking: 200,
        isForeign: false,
        isTransferred: false,
        isFemale: true,
        teamNumber: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '3',
        ffttId: '12347',
        firstName: 'Pierre',
        lastName: 'Durand',
        points: 1000,
        ranking: 250,
        isForeign: true,
        isTransferred: false,
        isFemale: false,
        teamNumber: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockBurnRecords = [];

    brulageService = new BrulageService(mockBurnRecords, mockPlayers);
  });

  describe('validateComposition', () => {
    it('should validate a correct composition', () => {
      const composition = {
        A: '1',
        B: '2',
        C: '3',
        D: undefined,
      };

      const result = brulageService.validateComposition(composition, 1, 1, 'aller');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject composition with too many female players', () => {
      const composition = {
        A: '2', // Marie (female)
        B: '2', // Marie (female) - duplicate for test
        C: '1',
        D: '3',
      };

      // Créer une joueuse supplémentaire pour le test
      const femalePlayer: Player = {
        ...mockPlayers[1],
        id: '4',
        firstName: 'Sophie',
        lastName: 'Bernard',
      };

      const playersWithExtraFemale = [...mockPlayers, femalePlayer];
      const serviceWithExtraFemale = new BrulageService(mockBurnRecords, playersWithExtraFemale);

      const compositionWithThreeFemales = {
        A: '2', // Marie
        B: '4', // Sophie
        C: '1',
        D: '3',
      };

      const result = serviceWithExtraFemale.validateComposition(
        compositionWithThreeFemales, 
        1, 
        1, 
        'aller'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.type === 'quota_female')).toBe(true);
    });

    it('should reject composition with too many foreign players', () => {
      const foreignPlayer: Player = {
        ...mockPlayers[2],
        id: '5',
        firstName: 'John',
        lastName: 'Smith',
      };

      const playersWithExtraForeign = [...mockPlayers, foreignPlayer];
      const serviceWithExtraForeign = new BrulageService(mockBurnRecords, playersWithExtraForeign);

      const compositionWithTwoForeign = {
        A: '3', // Pierre (foreign)
        B: '5', // John (foreign)
        C: '1',
        D: '2',
      };

      const result = serviceWithExtraForeign.validateComposition(
        compositionWithTwoForeign, 
        1, 
        1, 
        'aller'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.type === 'quota_foreign')).toBe(true);
    });

    it('should reject composition with incorrect ranking order', () => {
      const composition = {
        A: '2', // Marie (1100 pts)
        B: '1', // Jean (1200 pts) - should be first
        C: '3',
        D: undefined,
      };

      const result = brulageService.validateComposition(composition, 1, 1, 'aller');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.type === 'ranking_order')).toBe(true);
    });

    it('should reject burned player playing in higher team', () => {
      // Simuler un joueur brûlé qui a joué en équipe 1
      const burnRecord: BurnRecord = {
        id: 'burn1',
        playerId: '1',
        teamNumber: 1,
        journee: 1,
        phase: 'aller',
        matchId: 'match1',
        createdAt: new Date(),
      };

      const serviceWithBurn = new BrulageService([burnRecord], mockPlayers);

      const composition = {
        A: '1', // Jean brûlé en équipe 1, ne peut pas jouer en équipe 2
        B: '2',
        C: '3',
        D: undefined,
      };

      const result = serviceWithBurn.validateComposition(composition, 2, 2, 'aller');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.type === 'burn')).toBe(true);
    });
  });

  describe('getBurnCount', () => {
    it('should return correct burn count for a player', () => {
      const burnRecords: BurnRecord[] = [
        {
          id: 'burn1',
          playerId: '1',
          teamNumber: 1,
          journee: 1,
          phase: 'aller',
          matchId: 'match1',
          createdAt: new Date(),
        },
        {
          id: 'burn2',
          playerId: '1',
          teamNumber: 1,
          journee: 2,
          phase: 'aller',
          matchId: 'match2',
          createdAt: new Date(),
        },
      ];

      const service = new BrulageService(burnRecords, mockPlayers);
      const burnCount = service.getBurnCount('1', 'aller');

      expect(burnCount).toBe(2);
    });

    it('should return 0 for player with no burn records', () => {
      const burnCount = brulageService.getBurnCount('1', 'aller');
      expect(burnCount).toBe(0);
    });
  });

  describe('getAvailablePlayers', () => {
    it('should return all players when no restrictions', () => {
      const availablePlayers = brulageService.getAvailablePlayers(1, 1, 'aller');

      expect(availablePlayers).toHaveLength(3);
      expect(availablePlayers[0].points).toBeGreaterThanOrEqual(availablePlayers[1].points);
    });

    it('should exclude unavailable players', () => {
      const unavailablePlayerIds = ['1'];
      const availablePlayers = brulageService.getAvailablePlayers(
        1, 
        1, 
        'aller', 
        unavailablePlayerIds
      );

      expect(availablePlayers).toHaveLength(2);
      expect(availablePlayers.find(p => p.id === '1')).toBeUndefined();
    });

    it('should exclude burned players', () => {
      const burnRecord: BurnRecord = {
        id: 'burn1',
        playerId: '1',
        teamNumber: 1,
        journee: 1,
        phase: 'aller',
        matchId: 'match1',
        createdAt: new Date(),
      };

      const serviceWithBurn = new BrulageService([burnRecord], mockPlayers);
      const availablePlayers = serviceWithBurn.getAvailablePlayers(2, 2, 'aller');

      expect(availablePlayers).toHaveLength(2);
      expect(availablePlayers.find(p => p.id === '1')).toBeUndefined();
    });
  });
});
