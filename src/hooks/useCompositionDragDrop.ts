import { useState, useEffect, useCallback } from "react";
import type { Player } from "@/types/team-management";
import type { EquipeWithMatches } from "./useEquipesWithMatches";
import { createDragImage } from "@/lib/compositions/drag-utils";
import type { PhaseType } from "@/lib/compositions/validation";
import { canAssignPlayerToTeam, JOURNEE_CONCERNEE_PAR_REGLE } from "@/lib/compositions/validation";
import type { ChampionshipType } from "./useChampionshipTypes";
import { useMaxPlayersForTeam } from "./useMaxPlayersForTeam";

interface UseCompositionDragDropOptions {
  players: Player[];
  equipes: EquipeWithMatches[];
  filteredEquipes: EquipeWithMatches[];
  compositions: Record<string, string[]>;
  setCompositions?: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  selectedPhase: PhaseType | null;
  selectedJournee: number | null;
  tabValue?: number; // Pour compositions/page.tsx
  defaultCompositionTab?: "masculin" | "feminin"; // Pour compositions/defaults/page.tsx
  isParis?: boolean;
  compositionService?: {
    saveComposition: (options: {
      journee: number;
      phase: PhaseType;
      championshipType: ChampionshipType;
      teams: Record<string, string[]>;
    }) => Promise<void>;
  };
  setDefaultCompositions?: React.Dispatch<React.SetStateAction<{
    masculin: Record<string, string[]>;
    feminin: Record<string, string[]>;
  }>>;
  canDropPlayer?: (playerId: string, teamId: string) => { canAssign: boolean; reason?: string };
  onDrop?: (playerId: string, teamId: string) => Promise<void> | void; // Callback personnalisé pour le drop (utilisé si fourni au lieu de setCompositions)
  onRemovePlayer?: (teamId: string, playerId: string) => Promise<void> | void; // Callback personnalisé pour la suppression (utilisé si fourni au lieu de setCompositions)
}

/**
 * Hook pour gérer la logique de drag & drop des joueurs dans les compositions
 */
export function useCompositionDragDrop(
  options: UseCompositionDragDropOptions
): {
  draggedPlayerId: string | null;
  dragOverTeamId: string | null;
  handleDragStart: (e: React.DragEvent, playerId: string) => void;
  handleDragEnd: () => void;
  handleDragOver: (e: React.DragEvent, teamId: string) => void;
  handleDragLeave: () => void;
  handleDrop: (e: React.DragEvent, teamId: string) => void;
  handleRemovePlayer: (teamId: string, playerId: string) => void;
} {
  const {
    players,
    equipes,
    filteredEquipes,
    compositions,
    setCompositions,
    selectedPhase,
    selectedJournee,
    tabValue,
    defaultCompositionTab,
    isParis = false,
    compositionService,
    setDefaultCompositions,
    canDropPlayer,
    onDrop: customOnDrop,
    onRemovePlayer: customOnRemovePlayer,
  } = options;

  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);
  const [dragOverTeamId, setDragOverTeamId] = useState<string | null>(null);

  const { getMaxPlayersForTeam } = useMaxPlayersForTeam({ isParis });

  const handleDragStart = useCallback(
    (e: React.DragEvent, playerId: string) => {
      // Empêcher le drag si on clique sur le Chip de suppression ou un de ses enfants
      const target = e.target as HTMLElement;

      // Vérifier si le clic provient du Chip de suppression ou d'un de ses enfants
      const clickedChip =
        target.closest('[data-chip="remove"]') ||
        target.closest('button[aria-label*="remove"]') ||
        (target.tagName === "BUTTON" && target.textContent?.trim() === "×");

      if (clickedChip || target.textContent?.trim() === "×") {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      e.dataTransfer.setData("playerId", playerId);
      e.dataTransfer.effectAllowed = "move";
      setDraggedPlayerId(playerId);
      setDragOverTeamId(null);

      // Ajouter une classe au <html> pour forcer le curseur pendant le drag
      document.documentElement.classList.add("dragging");

      // Créer une image personnalisée pour le drag
      const player = players.find((p) => p.id === playerId);

      if (!player) {
        return;
      }

      // Déterminer le type de championnat pour le brûlage
      // Si le joueur est dans une équipe, utiliser le type de l'équipe
      // Sinon, utiliser le tab actuel (liste disponible) ou defaultCompositionTab
      let championshipType: "masculin" | "feminin" = defaultCompositionTab || "masculin";
      
      // Chercher le joueur dans les compositions pour déterminer son type
      const equipe = filteredEquipes.find((eq) => {
        const teamPlayers = compositions[eq.team.id] || [];
        return teamPlayers.includes(playerId);
      });
      
      if (equipe) {
        // Si le joueur est dans une équipe, utiliser le type de l'équipe
        championshipType = equipe.matches.some((match) => match.isFemale === true)
          ? "feminin"
          : "masculin";
      } else if (tabValue !== undefined) {
        // Sinon, utiliser le tab actuel (liste disponible)
        championshipType = tabValue === 0 ? "masculin" : "feminin";
      } else if (setDefaultCompositions) {
        // Pour defaults/page.tsx, chercher dans defaultCompositions pour déterminer le type
        // On ne peut pas accéder directement à defaultCompositions ici, donc on utilise defaultCompositionTab
        championshipType = defaultCompositionTab || "masculin";
      }

      // Créer l'image de drag uniforme
      const tempDiv = createDragImage(player, {
        championshipType,
        phase: (selectedPhase || "aller") as PhaseType,
      });
      document.body.appendChild(tempDiv);

      // Forcer un reflow pour s'assurer que les dimensions sont calculées
      void tempDiv.offsetHeight;

      // Utiliser l'élément temporaire comme image de drag
      e.dataTransfer.setDragImage(tempDiv, 0, 0);

      // Nettoyer après un court délai
      setTimeout(() => {
        if (document.body.contains(tempDiv)) {
          document.body.removeChild(tempDiv);
        }
      }, 0);
    },
    [players, filteredEquipes, compositions, selectedPhase, tabValue, defaultCompositionTab, setDefaultCompositions]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedPlayerId(null);
    setDragOverTeamId(null);

    // Retirer la classe du <html> pour restaurer le curseur par défaut
    document.documentElement.classList.remove("dragging");

    // Nettoyer le style injecté si présent (sécurité)
    const style = document.getElementById("drag-cursor-style");
    if (style) {
      style.remove();
    }
  }, []);

  // Nettoyer le drag si le drop se fait hors zone
  useEffect(() => {
    const clearDrag = () => {
      document.documentElement.classList.remove("dragging");
      const style = document.getElementById("drag-cursor-style");
      if (style) {
        style.remove();
      }
      setDraggedPlayerId(null);
      setDragOverTeamId(null);
    };

    window.addEventListener("drop", clearDrag);
    window.addEventListener("dragend", clearDrag);

    return () => {
      window.removeEventListener("drop", clearDrag);
      window.removeEventListener("dragend", clearDrag);
    };
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, teamId: string) => {
      e.preventDefault();
      setDragOverTeamId(teamId);

      if (draggedPlayerId && canDropPlayer) {
        const validation = canDropPlayer(draggedPlayerId, teamId);
        e.dataTransfer.dropEffect = validation.canAssign ? "move" : "none";
      } else {
        e.dataTransfer.dropEffect = "move";
      }
    },
    [draggedPlayerId, canDropPlayer]
  );

  const handleDragLeave = useCallback(() => {
    setDragOverTeamId(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, teamId: string) => {
      e.preventDefault();
      const playerId = e.dataTransfer.getData("playerId");

      setDragOverTeamId(null);

      if (!playerId) {
        setDraggedPlayerId(null);
        return;
      }

      const player = players.find((p) => p.id === playerId);
      const equipe = equipes.find((eq) => eq.team.id === teamId);

      if (!player || !equipe) {
        setDraggedPlayerId(null);
        return;
      }

      const validation = canDropPlayer ? canDropPlayer(playerId, teamId) : { canAssign: false };
      if (!validation.canAssign) {
        setDraggedPlayerId(null);
        return;
      }

      // Si un callback personnalisé est fourni, l'utiliser
      if (customOnDrop) {
        void customOnDrop(playerId, teamId);
        setDraggedPlayerId(null);
        return;
      }

      // Sinon, utiliser la logique par défaut avec setCompositions
      if (!setCompositions) {
        console.warn("[useCompositionDragDrop] setCompositions is required when onDrop is not provided");
        setDraggedPlayerId(null);
        return;
      }

      const isFemaleTeam = equipe.matches.some(
        (match) => match.isFemale === true
      );
      const championshipType: ChampionshipType = isFemaleTeam ? "feminin" : "masculin";

      setCompositions((prev) => {
        const equipeForMax = equipes.find((e) => e.team.id === teamId);
        const maxPlayers = equipeForMax ? getMaxPlayersForTeam(equipeForMax) : 4;

        const latestValidation = canAssignPlayerToTeam({
          playerId,
          teamId,
          players,
          equipes,
          compositions: prev,
          selectedPhase: selectedPhase || "aller",
          selectedJournee: selectedJournee || 1,
          journeeRule: JOURNEE_CONCERNEE_PAR_REGLE,
          maxPlayersPerTeam: maxPlayers,
        });

        if (!latestValidation.canAssign) {
          return prev;
        }

        const currentTeamPlayers = prev[teamId] || [];
        if (currentTeamPlayers.includes(playerId)) {
          return prev;
        }

        const updatedCompositions = { ...prev };
        const sameTypeEquipes = filteredEquipes.filter((eq) => {
          const eqIsFemale = eq.matches.some((match) => match.isFemale === true);
          return eqIsFemale === isFemaleTeam;
        });

        sameTypeEquipes.forEach((eq) => {
          if (updatedCompositions[eq.team.id]) {
            updatedCompositions[eq.team.id] = updatedCompositions[
              eq.team.id
            ].filter((id) => id !== playerId);
          }
        });

        const targetTeamPlayers = updatedCompositions[teamId] || [];
        if (targetTeamPlayers.length >= maxPlayers) {
          return prev;
        }

        if (player.nationality === "ETR") {
          const targetTeamPlayersData = targetTeamPlayers
            .map((pid) => players.find((p) => p.id === pid))
            .filter((p): p is Player => p !== undefined);

          const hasForeignPlayer = targetTeamPlayersData.some(
            (p) => p.nationality === "ETR"
          );

          if (hasForeignPlayer) {
            return prev;
          }
        }

        const newCompositions = {
          ...updatedCompositions,
          [teamId]: [...targetTeamPlayers, playerId],
        };

        if (setDefaultCompositions) {
          setDefaultCompositions((prevDefaults) => ({
            ...prevDefaults,
            [championshipType]: newCompositions,
          }));
        }

        if (selectedJournee !== null && selectedPhase !== null && compositionService) {
          const saveComposition = async () => {
            try {
              await compositionService.saveComposition({
                journee: selectedJournee,
                phase: selectedPhase,
                championshipType,
                teams: newCompositions,
              });
            } catch (error) {
              console.error("Erreur lors de la sauvegarde:", error);
            }
          };
          void saveComposition();
        }

        return newCompositions;
      });

      setDraggedPlayerId(null);
    },
    [
      players,
      equipes,
      filteredEquipes,
      canDropPlayer,
      getMaxPlayersForTeam,
      selectedPhase,
      selectedJournee,
      compositionService,
      setCompositions,
      setDefaultCompositions,
      customOnDrop,
    ]
  );

  const handleRemovePlayer = useCallback(
    (teamId: string, playerId: string) => {
      // Si un callback personnalisé est fourni, l'utiliser
      if (customOnRemovePlayer) {
        void customOnRemovePlayer(teamId, playerId);
        return;
      }

      // Sinon, utiliser la logique par défaut avec setCompositions
      if (!setCompositions) {
        console.warn("[useCompositionDragDrop] setCompositions is required when onRemovePlayer is not provided");
        return;
      }

      setCompositions((prev) => {
        const currentTeamPlayers = prev[teamId] || [];
        const equipe = filteredEquipes.find((eq) => eq.team.id === teamId);
        const isFemaleTeam = equipe?.matches.some(
          (match) => match.isFemale === true
        );
        const championshipType: ChampionshipType = isFemaleTeam ? "feminin" : "masculin";

        const newCompositions = {
          ...prev,
          [teamId]: currentTeamPlayers.filter((id) => id !== playerId),
        };

        if (setDefaultCompositions) {
          setDefaultCompositions((prevDefaults) => ({
            ...prevDefaults,
            [championshipType]: newCompositions,
          }));
        }

        if (selectedJournee !== null && selectedPhase !== null && compositionService) {
          const saveComposition = async () => {
            try {
              await compositionService.saveComposition({
                journee: selectedJournee,
                phase: selectedPhase,
                championshipType,
                teams: newCompositions,
              });
            } catch (error) {
              console.error("Erreur lors de la sauvegarde:", error);
            }
          };
          void saveComposition();
        }

        return newCompositions;
      });
    },
    [
      filteredEquipes,
      selectedJournee,
      selectedPhase,
      compositionService,
      setCompositions,
      setDefaultCompositions,
      customOnRemovePlayer,
    ]
  );

  return {
    draggedPlayerId,
    dragOverTeamId,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleRemovePlayer,
  };
}
