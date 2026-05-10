import { CompositionService } from "@/lib/services/composition-service";
import { ChampionshipType } from "@/types";
import { Player } from "@/types/team-management";
import { EquipeWithMatches } from "@/hooks/useTeamData";
import { extractTeamNumber } from "@/lib/compositions/validators";
import { isParisChampionship } from "@/lib/compositions/validators/team-utils";

type CompositionMap = Record<string, string[]>;

interface TeamAvailabilitiesMap {
  [playerId: string]: {
    available?: boolean;
    fridayAvailable?: boolean;
    saturdayAvailable?: boolean;
    comment?: string;
  };
}

interface ApplyAvailabilities {
  masculin?: TeamAvailabilitiesMap;
  feminin?: TeamAvailabilitiesMap;
}

interface TeamListItem {
  team: { id: string; name?: string };
}

interface ResetParams {
  selectedJournee: number;
  selectedPhase: "aller" | "retour";
  compositions: CompositionMap;
  equipesByType: { masculin: TeamListItem[]; feminin: TeamListItem[] };
  compositionService: CompositionService;
  setCompositions: (compositions: CompositionMap) => void;
  setIsResetting: (value: boolean) => void;
}

export async function resetCompositionsBatch({
  selectedJournee,
  selectedPhase,
  compositions,
  equipesByType,
  compositionService,
  setCompositions,
  setIsResetting,
}: ResetParams): Promise<void> {
  setIsResetting(true);

  const previousState: CompositionMap = Object.fromEntries(
    Object.entries(compositions).map(([teamId, playerIds]) => [teamId, [...playerIds]])
  );

  const masculineTeamIds = equipesByType.masculin.map((equipe) => equipe.team.id);
  const feminineTeamIds = equipesByType.feminin.map((equipe) => equipe.team.id);

  const emptyTeams = Object.fromEntries([
    ...masculineTeamIds.map<[string, string[]]>((teamId) => [teamId, []]),
    ...feminineTeamIds.map<[string, string[]]>((teamId) => [teamId, []]),
  ]);
  setCompositions(emptyTeams);

  try {
    await Promise.all([
      masculineTeamIds.length > 0
        ? compositionService.saveComposition({
            journee: selectedJournee,
            phase: selectedPhase,
            championshipType: "masculin",
            teams: Object.fromEntries(
              masculineTeamIds.map<[string, string[]]>((teamId) => [teamId, []])
            ),
          })
        : Promise.resolve(),
      feminineTeamIds.length > 0
        ? compositionService.saveComposition({
            journee: selectedJournee,
            phase: selectedPhase,
            championshipType: "feminin",
            teams: Object.fromEntries(
              feminineTeamIds.map<[string, string[]]>((teamId) => [teamId, []])
            ),
          })
        : Promise.resolve(),
    ]);
  } catch (error) {
    console.error("Erreur lors de la réinitialisation des compositions:", error);
    setCompositions(previousState);
  } finally {
    setIsResetting(false);
  }
}

interface ApplyDefaultsParams {
  selectedJournee: number;
  selectedPhase: "aller" | "retour";
  compositions: CompositionMap;
  defaultCompositions: { masculin: CompositionMap; feminin: CompositionMap };
  availabilities: ApplyAvailabilities;
  equipesByType: { masculin: TeamListItem[]; feminin: TeamListItem[] };
  filteredEquipes: EquipeWithMatches[];
  players: Player[];
  compositionService: CompositionService;
  setCompositions: (compositions: CompositionMap) => void;
  setIsApplyingDefaults: (value: boolean) => void;
}

export async function applyDefaultCompositionsBatch({
  selectedJournee,
  selectedPhase,
  compositions,
  defaultCompositions,
  availabilities,
  equipesByType,
  filteredEquipes,
  players,
  compositionService,
  setCompositions,
  setIsApplyingDefaults,
}: ApplyDefaultsParams): Promise<void> {
  setIsApplyingDefaults(true);

  const previousState: CompositionMap = Object.fromEntries(
    Object.entries(compositions).map(([teamId, playerIds]) => [teamId, [...playerIds]])
  );

  try {
    const masculineTeamIds = equipesByType.masculin.map((equipe) => equipe.team.id);
    const feminineTeamIds = equipesByType.feminin.map((equipe) => equipe.team.id);

    const nextCompositions: CompositionMap = Object.fromEntries([
      ...masculineTeamIds.map<[string, string[]]>((teamId) => [teamId, []]),
      ...feminineTeamIds.map<[string, string[]]>((teamId) => [teamId, []]),
    ]);

    const processType = (championshipType: ChampionshipType, teamIds: string[]) => {
      const defaultsForType = defaultCompositions[championshipType] || {};
      const availabilityMap =
        (championshipType === "masculin"
          ? availabilities.masculin
          : availabilities.feminin) || {};

      teamIds.forEach((teamId) => {
        const defaultPlayers = defaultsForType[teamId] || [];
        const nextTeamPlayers: string[] = [];

        defaultPlayers.forEach((playerId) => {
          const availability = availabilityMap[playerId];
          if (!availability || availability.available !== true) return;

          const player = players.find((p) => p.id === playerId);
          if (!player) return;

          if (nextTeamPlayers.length >= 5) return;

          const maxMasculine =
            player.highestMasculineTeamNumberByPhase?.[selectedPhase || "aller"];
          const maxFeminine =
            player.highestFeminineTeamNumberByPhase?.[selectedPhase || "aller"];
          const teamNumber = extractTeamNumber(
            filteredEquipes.find((eq) => eq.team.id === teamId)?.team.name || ""
          );

          if (
            teamNumber > 0 &&
            ((championshipType === "masculin" &&
              maxMasculine !== undefined &&
              maxMasculine !== null &&
              teamNumber > maxMasculine) ||
              (championshipType === "feminin" &&
                maxFeminine !== undefined &&
                maxFeminine !== null &&
                teamNumber > maxFeminine))
          ) {
            return;
          }

          // Paris championships have no foreign-player cap.
          const equipe = filteredEquipes.find((eq) => eq.team.id === teamId);
          const isParis = equipe ? isParisChampionship(equipe) : false;
          if (!isParis && player.nationality === "ETR") {
            const hasForeignPlayer = nextTeamPlayers
              .map((pid) => players.find((p) => p.id === pid))
              .filter((p): p is Player => p !== undefined)
              .some((p) => p.nationality === "ETR");

            if (hasForeignPlayer) return;
          }

          nextTeamPlayers.push(playerId);
        });

        nextCompositions[teamId] = nextTeamPlayers;
      });
    };

    processType("masculin", masculineTeamIds);
    processType("feminin", feminineTeamIds);
    setCompositions(nextCompositions);

    await Promise.all([
      masculineTeamIds.length > 0
        ? compositionService.saveComposition({
            journee: selectedJournee,
            phase: selectedPhase,
            championshipType: "masculin",
            teams: Object.fromEntries(
              masculineTeamIds.map<[string, string[]]>((teamId) => [
                teamId,
                nextCompositions[teamId] || [],
              ])
            ),
          })
        : Promise.resolve(),
      feminineTeamIds.length > 0
        ? compositionService.saveComposition({
            journee: selectedJournee,
            phase: selectedPhase,
            championshipType: "feminin",
            teams: Object.fromEntries(
              feminineTeamIds.map<[string, string[]]>((teamId) => [
                teamId,
                nextCompositions[teamId] || [],
              ])
            ),
          })
        : Promise.resolve(),
    ]);
  } catch (error) {
    console.error("Erreur lors de la copie des compositions par défaut:", error);
    setCompositions(previousState);
  } finally {
    setIsApplyingDefaults(false);
  }
}
