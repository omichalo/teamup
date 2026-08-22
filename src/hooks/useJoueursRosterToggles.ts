"use client";

import { useCallback } from "react";
import { patchChampionshipRosterPerson } from "@/lib/championship/client";
import type { Player } from "@/types/team-management";

function rosterKey(player: Player): string {
  return player.championshipPersonKey || player.id;
}

type Params = {
  players: Player[];
  playersWithoutLicense: Player[];
  temporaryPlayers: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  setPlayersWithoutLicense: React.Dispatch<React.SetStateAction<Player[]>>;
  setTemporaryPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  setFilteredPlayers?: React.Dispatch<React.SetStateAction<Player[]>>;
  updatePlayerInStore: (playerId: string, updates: Partial<Player>) => void;
  recomputeFilteredPlayersFromLists: (
    nextPlayers: Player[],
    nextPlayersWithoutLicense: Player[],
    nextTemporaryPlayers: Player[]
  ) => void;
};

function mapPlayer(
  list: Player[],
  playerId: string,
  updates: Partial<Player>
): Player[] {
  return list.map((item) =>
    item.id === playerId ? { ...item, ...updates } : item
  );
}

export function useJoueursRosterToggles({
  players,
  playersWithoutLicense,
  temporaryPlayers,
  setPlayers,
  setPlayersWithoutLicense,
  setTemporaryPlayers,
  setFilteredPlayers,
  updatePlayerInStore,
  recomputeFilteredPlayersFromLists,
}: Params) {
  const applyLocal = useCallback(
    (playerId: string, updates: Partial<Player>) => {
      const nextPlayers = mapPlayer(players, playerId, updates);
      const nextWithout = mapPlayer(playersWithoutLicense, playerId, updates);
      const nextTemporary = mapPlayer(temporaryPlayers, playerId, updates);
      setPlayers(nextPlayers);
      setPlayersWithoutLicense(nextWithout);
      setTemporaryPlayers(nextTemporary);
      setFilteredPlayers?.((prev) => mapPlayer(prev, playerId, updates));
      updatePlayerInStore(playerId, updates);
      recomputeFilteredPlayersFromLists(nextPlayers, nextWithout, nextTemporary);
    },
    [
      players,
      playersWithoutLicense,
      temporaryPlayers,
      recomputeFilteredPlayersFromLists,
      setFilteredPlayers,
      setPlayers,
      setPlayersWithoutLicense,
      setTemporaryPlayers,
      updatePlayerInStore,
    ]
  );

  const handleToggleParticipation = useCallback(
    async (player: Player, isParticipating: boolean) => {
      try {
        await patchChampionshipRosterPerson(rosterKey(player), {
          championnat: isParticipating,
        });
        applyLocal(player.id, {
          participation: { ...player.participation, championnat: isParticipating },
        });
      } catch (error) {
        console.error("Erreur lors de la mise à jour de la participation:", error);
      }
    },
    [applyLocal]
  );

  const handleToggleParticipationParis = useCallback(
    async (player: Player, inChampionshipParis: boolean) => {
      try {
        await patchChampionshipRosterPerson(rosterKey(player), {
          championnatParis: inChampionshipParis,
        });
        applyLocal(player.id, {
          participation: {
            ...player.participation,
            championnatParis: inChampionshipParis,
          },
        });
      } catch (error) {
        console.error(
          "Erreur lors de la mise à jour de la participation au championnat de Paris:",
          error
        );
        alert("Erreur lors de la mise à jour de la participation");
      }
    },
    [applyLocal]
  );

  const handleToggleWheelchair = useCallback(
    async (player: Player) => {
      const next = !player.isWheelchair;
      applyLocal(player.id, { isWheelchair: next });
      try {
        await patchChampionshipRosterPerson(rosterKey(player), {
          isWheelchair: next,
        });
      } catch (error) {
        console.error("Erreur lors de la mise à jour du flag fauteuil:", error);
        applyLocal(player.id, { isWheelchair: player.isWheelchair === true });
      }
    },
    [applyLocal]
  );

  return {
    handleToggleParticipation,
    handleToggleParticipationParis,
    handleToggleWheelchair,
  };
}
