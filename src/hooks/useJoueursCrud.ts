import { useCallback, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { getDbInstanceDirect } from "@/lib/firebase";
import { Player } from "@/types/team-management";
import { FirestorePlayerService } from "@/lib/services/firestore-player-service";

interface JoueurFormState {
  firstName: string;
  name: string;
  license: string;
  gender: "M" | "F";
  nationality: "FR" | "C" | "ETR";
  points: number;
  inChampionship: boolean;
  isWheelchair: boolean;
}

interface UseJoueursCrudParams {
  playerService: FirestorePlayerService;
  players: Player[];
  playersWithoutLicense: Player[];
  temporaryPlayers: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  setPlayersWithoutLicense: React.Dispatch<React.SetStateAction<Player[]>>;
  setTemporaryPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  updatePlayerInStore: (playerId: string, updates: Partial<Player>) => void;
  removePlayerFromStore: (playerId: string) => void;
  loadPlayers: () => Promise<void>;
  recomputeFilteredPlayersFromLists: (
    nextPlayers: Player[],
    nextPlayersWithoutLicense: Player[],
    nextTemporaryPlayers: Player[]
  ) => void;
}

const DEFAULT_NEW_PLAYER: JoueurFormState = {
  firstName: "",
  name: "",
  license: "",
  gender: "M",
  nationality: "FR",
  points: 500,
  inChampionship: true,
  isWheelchair: false,
};

export function useJoueursCrud({
  playerService,
  players,
  playersWithoutLicense,
  temporaryPlayers,
  setPlayers,
  setPlayersWithoutLicense,
  setTemporaryPlayers,
  updatePlayerInStore,
  removePlayerFromStore,
  loadPlayers,
  recomputeFilteredPlayersFromLists,
}: UseJoueursCrudParams) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [newPlayer, setNewPlayer] = useState<JoueurFormState>(DEFAULT_NEW_PLAYER);
  const [licenseExists, setLicenseExists] = useState(false);
  const [licenseExistsForOther, setLicenseExistsForOther] = useState(false);
  const [discordMentions, setDiscordMentions] = useState<string[]>([]);
  const [discordMentionError, setDiscordMentionError] = useState<string | null>(null);

  const checkLicenseExists = useCallback(
    async (license: string, excludePlayerId?: string) => {
      if (!license.trim()) {
        setLicenseExists(false);
        setLicenseExistsForOther(false);
        return;
      }
      try {
        const exists = await playerService.checkPlayerExists(license.trim());
        if (excludePlayerId && exists) {
          const playerRef = doc(getDbInstanceDirect(), "players", license.trim());
          const playerSnap = await getDoc(playerRef);
          if (playerSnap.exists() && playerSnap.id === excludePlayerId) {
            setLicenseExists(false);
            setLicenseExistsForOther(false);
            return;
          }
        }
        setLicenseExists(exists);
        setLicenseExistsForOther(exists && excludePlayerId ? exists : false);
      } catch (error) {
        console.error("Erreur lors de la vérification de la licence:", error);
        setLicenseExists(false);
        setLicenseExistsForOther(false);
      }
    },
    [playerService]
  );

  const handleCreateTemporaryPlayer = useCallback(async () => {
    if (!newPlayer.firstName.trim() || !newPlayer.name.trim()) {
      alert("Le prénom et le nom sont obligatoires");
      return;
    }
    if (newPlayer.license.trim() && licenseExists) {
      alert("Un joueur avec ce numéro de licence existe déjà");
      return;
    }
    try {
      setCreating(true);
      const normalizedName = newPlayer.name.trim().toUpperCase();
      const normalizedFirstName =
        newPlayer.firstName.trim().charAt(0).toUpperCase() +
        newPlayer.firstName.trim().slice(1).toLowerCase();

      await playerService.createTemporaryPlayer({
        firstName: normalizedFirstName,
        name: normalizedName,
        license: newPlayer.license.trim() || "",
        gender: newPlayer.gender,
        nationality: newPlayer.nationality,
        isActive: false,
        isTemporary: true,
        isWheelchair: newPlayer.isWheelchair,
        typeLicence: "",
        points: newPlayer.points || 500,
        preferredTeams: { masculine: [], feminine: [] },
        participation: {
          championnat: newPlayer.inChampionship,
          championnatParis: false,
        },
        hasPlayedAtLeastOneMatch: false,
        hasPlayedAtLeastOneMatchParis: false,
        ...(discordMentions.length > 0 ? { discordMentions } : {}),
      });

      await loadPlayers();
      setCreateDialogOpen(false);
      setNewPlayer(DEFAULT_NEW_PLAYER);
      setDiscordMentions([]);
      setDiscordMentionError(null);
      setLicenseExists(false);
      setLicenseExistsForOther(false);
    } catch (error) {
      console.error("Erreur lors de la création du joueur temporaire:", error);
      alert("Erreur lors de la création du joueur temporaire");
    } finally {
      setCreating(false);
    }
  }, [discordMentions, licenseExists, loadPlayers, newPlayer, playerService]);

  const handleEditPlayer = useCallback((player: Player) => {
    setEditingPlayer(player);
    setNewPlayer({
      firstName: player.firstName,
      name: player.name,
      license: player.license || "",
      gender: player.gender,
      nationality: player.nationality,
      points: player.points || 500,
      inChampionship: player.participation?.championnat || false,
      isWheelchair: player.isWheelchair || false,
    });
    setDiscordMentions(player.discordMentions || []);
    setDiscordMentionError(null);
    setLicenseExists(false);
    setLicenseExistsForOther(false);
    setEditDialogOpen(true);
  }, []);

  const handleUpdatePlayer = useCallback(async () => {
    if (!editingPlayer) return;
    if (discordMentionError) return;

    if (editingPlayer.isTemporary) {
      if (!newPlayer.firstName.trim() || !newPlayer.name.trim()) {
        alert("Le prénom et le nom sont obligatoires");
        return;
      }
      if (newPlayer.license.trim() && licenseExistsForOther) {
        alert(
          "Un joueur avec ce numéro de licence existe déjà. Un joueur temporaire ne peut pas correspondre à un joueur existant."
        );
        return;
      }
    }

    try {
      setUpdating(true);
      const normalizedName = newPlayer.name.trim().toUpperCase();
      const normalizedFirstName =
        newPlayer.firstName.trim().charAt(0).toUpperCase() +
        newPlayer.firstName.trim().slice(1).toLowerCase();

      if (editingPlayer.isTemporary) {
        await playerService.updateTemporaryPlayer(editingPlayer.id, {
          firstName: normalizedFirstName,
          name: normalizedName,
          license: newPlayer.license.trim() || "",
          gender: newPlayer.gender,
          nationality: newPlayer.nationality,
          isActive: false,
          isTemporary: true,
          isWheelchair: newPlayer.isWheelchair,
          typeLicence: editingPlayer.typeLicence || "",
          points: newPlayer.points || 500,
          preferredTeams: editingPlayer.preferredTeams || { masculine: [], feminine: [] },
          participation: {
            championnat: newPlayer.inChampionship,
            championnatParis: false,
          },
          hasPlayedAtLeastOneMatch: editingPlayer.hasPlayedAtLeastOneMatch || false,
          hasPlayedAtLeastOneMatchParis:
            editingPlayer.hasPlayedAtLeastOneMatchParis || false,
          ...(discordMentions.length > 0 ? { discordMentions } : {}),
        });
      } else {
        await playerService.updatePlayer(editingPlayer.id, {
          discordMentions,
          isWheelchair: newPlayer.isWheelchair,
        });
      }

      const updatePlayerInLists = (p: Player): Player =>
        p.id === editingPlayer.id
          ? {
              ...p,
              discordMentions: discordMentions.length > 0 ? discordMentions : [],
              isWheelchair: newPlayer.isWheelchair,
            }
          : p;

      const updatedPlayers = players.map(updatePlayerInLists);
      const updatedPlayersWithoutLicense = playersWithoutLicense.map(updatePlayerInLists);
      const updatedTemporaryPlayers = temporaryPlayers.map(updatePlayerInLists);

      setPlayers(updatedPlayers);
      setPlayersWithoutLicense(updatedPlayersWithoutLicense);
      setTemporaryPlayers(updatedTemporaryPlayers);

      if (!editingPlayer.isTemporary) {
        updatePlayerInStore(editingPlayer.id, {
          discordMentions: discordMentions.length > 0 ? discordMentions : [],
          isWheelchair: newPlayer.isWheelchair,
        });
      } else {
        const updatedPlayer = updatedPlayers.find((p) => p.id === editingPlayer.id);
        if (updatedPlayer?.participation) {
          updatePlayerInStore(editingPlayer.id, {
            participation: updatedPlayer.participation,
            isWheelchair: newPlayer.isWheelchair,
          });
        }
      }

      recomputeFilteredPlayersFromLists(
        updatedPlayers,
        updatedPlayersWithoutLicense,
        updatedTemporaryPlayers
      );

      setNewPlayer(DEFAULT_NEW_PLAYER);
      setDiscordMentions([]);
      setEditingPlayer(null);
      setLicenseExists(false);
      setLicenseExistsForOther(false);
      setEditDialogOpen(false);
    } catch (error) {
      console.error("Erreur lors de la mise à jour du joueur:", error);
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
      if (errorMessage.includes("existe déjà")) {
        alert("Un joueur avec ce numéro de licence existe déjà");
      } else {
        alert(
          `Erreur lors de la mise à jour du joueur${editingPlayer?.isTemporary ? " temporaire" : ""}`
        );
      }
    } finally {
      setUpdating(false);
    }
  }, [
    discordMentionError,
    discordMentions,
    editingPlayer,
    licenseExistsForOther,
    newPlayer,
    playerService,
    players,
    playersWithoutLicense,
    recomputeFilteredPlayersFromLists,
    setPlayers,
    setPlayersWithoutLicense,
    setTemporaryPlayers,
    temporaryPlayers,
    updatePlayerInStore,
  ]);

  const handleDeletePlayer = useCallback(
    async (player: Player) => {
      const confirmDelete = confirm(
        `Êtes-vous sûr de vouloir supprimer le joueur temporaire ${player.firstName} ${player.name} ?`
      );
      if (!confirmDelete) return;
      try {
        setDeleting(player.id);
        await playerService.deletePlayer(player.id);
        removePlayerFromStore(player.id);
        await loadPlayers();
      } catch (error) {
        console.error("Erreur lors de la suppression du joueur:", error);
        alert("Erreur lors de la suppression du joueur");
      } finally {
        setDeleting(null);
      }
    },
    [loadPlayers, playerService, removePlayerFromStore]
  );

  return {
    createDialogOpen,
    setCreateDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
    editingPlayer,
    setEditingPlayer,
    creating,
    updating,
    deleting,
    newPlayer,
    setNewPlayer,
    licenseExists,
    setLicenseExists,
    licenseExistsForOther,
    setLicenseExistsForOther,
    discordMentions,
    setDiscordMentions,
    discordMentionError,
    setDiscordMentionError,
    checkLicenseExists,
    handleCreateTemporaryPlayer,
    handleEditPlayer,
    handleUpdatePlayer,
    handleDeletePlayer,
  };
}
