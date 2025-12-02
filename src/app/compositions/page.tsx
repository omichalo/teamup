"use client";

// Force dynamic rendering to avoid static generation errors
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
} from "@mui/material";
import { CompositionService } from "@/lib/services/composition-service";
import { AuthGuard } from "@/components/AuthGuard";
import { USER_ROLES } from "@/lib/auth/roles";
import { useMaxPlayersForTeam } from "@/hooks/useMaxPlayersForTeam";
import { useFilteredEquipes } from "@/hooks/useFilteredEquipes";
import { useEquipesByType } from "@/hooks/useEquipesByType";
import { useCanDropPlayer } from "@/hooks/useCanDropPlayer";
import { useCompositionValidation } from "@/hooks/useCompositionValidation";
import { useCompositionDragDrop } from "@/hooks/useCompositionDragDrop";
import { useCompositionRules } from "@/hooks/useCompositionRules";
import { useFilteredPlayers } from "@/hooks/useFilteredPlayers";
import { usePlayersWithoutAssignment } from "@/hooks/usePlayersWithoutAssignment";
import { AvailablePlayerItem } from "@/components/compositions/AvailablePlayerItem";
import { useCompositionState } from "@/hooks/useCompositionState";
import { CompositionDialogs } from "@/components/compositions/CompositionDialogs";
import { useDiscordMessage } from "@/hooks/useDiscordMessage";
import { useCompositionPlayers } from "@/hooks/useCompositionPlayers";
import { useAvailablePlayers } from "@/hooks/useAvailablePlayers";
import { CompositionPageLayout } from "@/components/compositions/CompositionPageLayout";
import { useChampionshipTab } from "@/hooks/useChampionshipTab";
import { useCompositionActions } from "@/hooks/useCompositionActions";
import { useCompositionChecks } from "@/hooks/useCompositionChecks";
import { CompositionHeader } from "@/components/compositions/CompositionHeader";
import { CompositionTabs } from "@/components/compositions/CompositionTabs";
import { useCompositionAvailabilities } from "@/hooks/useCompositionAvailabilities";
import { useDefaultCompositions } from "@/hooks/useDefaultCompositions";
import { useCompositionSync } from "@/hooks/useCompositionSync";
import { useCompositionSummary } from "@/hooks/useCompositionSummary";
import { useCompositionConfirmation } from "@/hooks/useCompositionConfirmation";
import { useAppData, useLocations } from "@/hooks/useAppData";
import { useSelection } from "@/hooks/useSelection";

// Le composant MentionSuggestions est maintenant dans DiscordMessageEditor

import { cleanTeamName, formatDivision } from "@/lib/compositions/format-utils";

export default function CompositionsPage() {
  // Utiliser les données depuis le store global
  const { equipes, loading: loadingEquipes } = useAppData();
  const locations = useLocations();

  // Utiliser les sélections depuis le store (synchronisées entre pages)
  const {
    selectedEpreuve,
    selectedPhase,
    selectedJournee,
    setSelectedEpreuve,
    setSelectedPhase,
    setSelectedJournee,
    journeesByPhase,
    isParis,
  } = useSelection({
    equipes,
    loadingEquipes,
    autoInitialize: true,
    showJournee: true,
  });
  const { players, loadingPlayers, loadPlayers } = useCompositionPlayers({
    includeAllPlayers: false,
    selectedEpreuve,
  });
  const [isResetting, setIsResetting] = useState(false);
  const [isApplyingDefaults, setIsApplyingDefaults] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showMatchInfo, setShowMatchInfo] = useState<Record<string, boolean>>(
    {}
  );

  const compositionService = useMemo(() => new CompositionService(), []);

  // Règles de composition
  const compositionRules = useCompositionRules(selectedEpreuve, "daily");

  // Filtrer les équipes selon l'épreuve sélectionnée
  const { filteredEquipes } = useFilteredEquipes(equipes, selectedEpreuve);

  // Charger les joueurs au montage
  useEffect(() => {
    void loadPlayers();
  }, [loadPlayers]);

  // Gérer les disponibilités
  const { availabilities, availabilitiesLoaded } = useCompositionAvailabilities(
    {
      selectedJournee,
      selectedPhase,
      selectedEpreuve,
    }
  );

  // Charger les compositions par défaut
  const {
    defaultCompositions,
    setDefaultCompositions,
    defaultCompositionsLoaded,
  } = useDefaultCompositions({
    selectedPhase,
  });

  // Calculer le maxPlayers selon l'épreuve et la division
  const { getMaxPlayersForTeam } = useMaxPlayersForTeam({ isParis });

  // Grouper les équipes par type (masculin/féminin)
  const equipesByType = useEquipesByType(filteredEquipes);

  // Gérer les tabs masculin/féminin et les calculs associés
  const {
    tabValue,
    currentTab,
    currentTeams: currentTypeEquipes,
    championshipType,
    handleTabChange,
  } = useChampionshipTab({
    isParis,
    equipesByType,
    initialTab: 0,
  });

  // Synchroniser les compositions en temps réel (doit être avant useCompositionValidation)
  const { compositions, setCompositions } = useCompositionSync({
    selectedJournee,
    selectedPhase,
    championshipType,
    defaultCompositions,
    defaultCompositionsLoaded,
    availabilities,
    availabilitiesLoaded,
    equipes,
    getMaxPlayersForTeam,
  });

  // Validation des compositions
  const { validationErrors: teamValidationErrors } = useCompositionValidation({
    filteredEquipes,
    players,
    equipes,
    compositions,
    selectedPhase,
    selectedJournee,
    availabilities,
    loadingEquipes,
    loadingPlayers,
    isParis,
  });

  // Filtrer les joueurs disponibles selon l'onglet sélectionné
  const { availablePlayers } = useAvailablePlayers({
    players,
    selectedEpreuve,
    tabValue,
    availabilities,
    selectedJournee,
    selectedPhase,
    isParis,
  });

  // Filtrer les joueurs disponibles selon la recherche
  const filteredAvailablePlayers = useFilteredPlayers(
    availablePlayers,
    searchQuery
  );

  const availablePlayersSubtitle = useMemo(() => {
    const base = currentTab === "masculin" ? "Masculin" : "Féminin";
    if (selectedJournee) {
      return `${base} - Journée ${selectedJournee}`;
    }
    return base;
  }, [currentTab, selectedJournee]);

  // Utiliser le hook useDiscordMessage pour gérer toute la logique Discord
  const discordMessage = useDiscordMessage({
    selectedJournee,
    selectedPhase,
    equipesByType,
    locations,
    cleanTeamName,
    formatDivision,
  });

  // Extraire les valeurs du hook
  const {
    discordSentStatus,
    customMessages,
    setCustomMessages,
    confirmResendDialog,
    setConfirmResendDialog,
    discordChannels,
    sendMessage: handleSendDiscordMessage,
    formatMatchInfo,
    saveCustomMessage: handleSaveCustomMessage,
    saveTimeoutRef,
  } = discordMessage;

  // Vérifier les états des compositions
  const { hasAssignedPlayers, hasDefaultCompositions } = useCompositionChecks({
    compositions,
    defaultCompositions,
  });

  // Utiliser le hook useCompositionState pour gérer les fonctions de composition
  const {
    resetCompositions: runResetCompositions,
    applyDefaults: runApplyDefaultCompositions,
  } = useCompositionState({
    selectedJournee,
    selectedPhase,
    equipesByType,
    filteredEquipes,
    players,
    availabilities,
    defaultCompositions,
    defaultCompositionsLoaded,
    availabilitiesLoaded,
    compositionService,
    hasAssignedPlayers,
    hasDefaultCompositions,
    compositions,
    setCompositions,
    isResetting,
    setIsResetting,
    isApplyingDefaults,
    setIsApplyingDefaults,
  });

  // Calculer les joueurs sans assignation
  // currentTypeEquipes est maintenant fourni par useChampionshipTab

  const {
    availablePlayersWithoutAssignment,
    filteredAvailablePlayersWithoutAssignment,
  } = usePlayersWithoutAssignment({
    availablePlayers,
    filteredAvailablePlayers,
    currentTeams: currentTypeEquipes,
    assignments: compositions,
  });

  // Calculer le summary des compositions
  const { compositionSummary, discordStats } = useCompositionSummary({
    tabValue,
    equipesByType,
    compositions,
    players,
    selectedJournee,
    selectedPhase,
    isParis,
    teamValidationErrors,
    discordSentStatus,
  });

  // Vérifier si un drop est possible
  const { canDropPlayer } = useCanDropPlayer({
    players,
    equipes,
    compositions,
    selectedPhase,
    selectedJournee,
    isParis,
  });

  // Gestion du drag & drop
  const {
    draggedPlayerId,
    dragOverTeamId,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleRemovePlayer,
  } = useCompositionDragDrop({
    players,
    equipes,
    filteredEquipes,
    compositions,
    setCompositions,
    selectedPhase,
    selectedJournee,
    tabValue,
    isParis,
    compositionService,
    setDefaultCompositions,
    canDropPlayer,
  });

  // Gérer les confirmations
  const {
    confirmationDialog,
    setConfirmationDialog,
    handleCancelConfirmation,
    handleConfirmDialog,
  } = useCompositionConfirmation();

  // Gérer les actions (reset, apply defaults)
  const {
    canResetButton,
    canCopyDefaultsButton,
    handleResetButtonClick,
    handleApplyDefaultsClick,
  } = useCompositionActions({
    selectedJournee,
    selectedPhase,
    hasAssignedPlayers,
    hasDefaultCompositions,
    defaultCompositionsLoaded,
    availabilitiesLoaded,
    isResetting,
    isApplyingDefaults,
    runResetCompositions,
    runApplyDefaultCompositions,
    setConfirmationDialog,
  });

  if (loadingEquipes || loadingPlayers) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <AuthGuard
      allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.COACH]}
      redirectWhenUnauthorized="/joueur"
    >
      <Box sx={{ p: 5 }}>
        <CompositionDialogs
          confirmationDialog={confirmationDialog}
          onCloseConfirmation={handleCancelConfirmation}
          onConfirmConfirmation={handleConfirmDialog}
          confirmResendDialog={confirmResendDialog}
          onCloseResend={() =>
            setConfirmResendDialog({
              open: false,
              teamId: null,
              matchInfo: null,
            })
          }
          onConfirmResend={() => {
            if (
              confirmResendDialog.teamId &&
              confirmResendDialog.matchInfo &&
              selectedJournee &&
              selectedPhase
            ) {
              handleSendDiscordMessage(
                confirmResendDialog.teamId,
                confirmResendDialog.matchInfo,
                selectedJournee,
                selectedPhase,
                confirmResendDialog.channelId
              );
              setConfirmResendDialog({
                open: false,
                teamId: null,
                matchInfo: null,
              });
            }
          }}
        />

        <CompositionHeader
          title="Composition des Équipes"
          description="Composez les équipes pour une journée de championnat."
          selectedEpreuve={selectedEpreuve}
          selectedPhase={selectedPhase}
          selectedJournee={selectedJournee}
          onEpreuveChange={setSelectedEpreuve}
          onPhaseChange={setSelectedPhase}
          onJourneeChange={setSelectedJournee}
          isParis={isParis}
          journeesByPhase={journeesByPhase}
          compositionRules={compositionRules}
          canCopyDefaultsButton={canCopyDefaultsButton}
          canResetButton={canResetButton}
          onApplyDefaultsClick={handleApplyDefaultsClick}
          onResetClick={handleResetButtonClick}
        />

        {selectedJournee && (isParis || selectedPhase) ? (
          <>
            <CompositionTabs
              tabValue={tabValue}
              onTabChange={handleTabChange}
              isParis={isParis}
            />

            <CompositionPageLayout
              availablePlayersPanel={{
                title: "Joueurs disponibles",
                subtitle: availablePlayersSubtitle,
                searchQuery,
                onSearchChange: setSearchQuery,
                totalCount: availablePlayersWithoutAssignment.length,
                filteredPlayers: filteredAvailablePlayersWithoutAssignment,
                renderPlayerItem: (player) => {
                  const phase = (selectedPhase || "aller") as
                    | "aller"
                    | "retour";
                  const championshipType =
                    tabValue === 0 ? "masculin" : "feminin";
                  return (
                    <AvailablePlayerItem
                      player={player}
                      phase={phase}
                      championshipType={championshipType}
                      isParis={isParis}
                      selectedEpreuve={selectedEpreuve}
                      draggedPlayerId={draggedPlayerId}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                    />
                  );
                },
              }}
              summary={{
                totalTeams: compositionSummary.totalEditable,
                completedTeams: compositionSummary.equipesCompletes,
                incompleteTeams: compositionSummary.equipesIncompletes,
                invalidTeams: compositionSummary.equipesInvalides,
                matchesPlayed: compositionSummary.equipesMatchsJoues,
                percentage: compositionSummary.percentage,
                discordMessagesSent: discordStats.sent,
                discordMessagesTotal: discordStats.total,
              }}
              tabsContent={{
                mode: "daily",
                tabValue,
                prefix: "compositions",
                equipesByType,
                players,
                compositions,
                tabValueProp: tabValue,
                draggedPlayerId,
                dragOverTeamId,
                teamValidationErrors,
                availabilities,
                onRemovePlayer: handleRemovePlayer,
                onDragStart: handleDragStart,
                onDragEnd: handleDragEnd,
                onDragOver: handleDragOver,
                onDragLeave: handleDragLeave,
                onDrop: handleDrop,
                formatMatchInfo,
                showMatchInfo,
                setShowMatchInfo,
                discordSentStatus,
                customMessages,
                setCustomMessages,
                handleSaveCustomMessage,
                handleSendDiscordMessage,
                setConfirmResendDialog,
                discordChannels,
                saveTimeoutRef,
              }}
            />
          </>
        ) : null}

        {(!selectedJournee || !selectedPhase) && (
          <Card>
            <CardContent>
              <Typography variant="body1" color="text.secondary" align="center">
                Veuillez sélectionner une phase et une journée pour commencer
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>
    </AuthGuard>
  );
}
