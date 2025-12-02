"use client";

import { Typography } from "@mui/material";
import type { EquipeWithMatches } from "@/hooks/useEquipesWithMatches";
import type { EpreuveType } from "@/lib/shared/epreuve-utils";
import { CompositionTabPanel } from "./CompositionTabPanel";
import { CompositionTeamList } from "./CompositionTeamList";
import type { CompositionTeamListProps } from "./CompositionTeamList";

export interface CompositionTabsContentProps {
  mode: "daily" | "defaults";
  tabValue: number;
  prefix: string;
  isParis?: boolean; // Optionnel, utilise le store si non fourni
  equipesByType: {
    masculin: EquipeWithMatches[];
    feminin: EquipeWithMatches[];
  };
  selectedEpreuve?: EpreuveType | null; // Optionnel, utilise le store si non fourni
  // Props communes pour CompositionTeamList
  players: CompositionTeamListProps["players"];
  compositions?: CompositionTeamListProps["compositions"];
  defaultCompositions?: CompositionTeamListProps["defaultCompositions"];
  selectedJournee?: number | null; // Optionnel, utilise le store si non fourni
  selectedPhase?: "aller" | "retour" | null; // Optionnel, utilise le store si non fourni
  tabValueProp?: number;
  defaultCompositionTab?: "masculin" | "feminin";
  draggedPlayerId: string | null;
  dragOverTeamId: string | null;
  teamValidationErrors?: CompositionTeamListProps["teamValidationErrors"];
  defaultCompositionErrors?: CompositionTeamListProps["defaultCompositionErrors"];
  availabilities?: CompositionTeamListProps["availabilities"];
  onRemovePlayer: (teamId: string, playerId: string) => void;
  onDragStart: (event: React.DragEvent, playerId: string) => void;
  onDragEnd: () => void;
  onDragOver?: (event: React.DragEvent, teamId: string) => void;
  onDragLeave?: () => void;
  onDrop?: (event: React.DragEvent, teamId: string) => void;
  // Props spécifiques au mode "daily"
  formatMatchInfo?: CompositionTeamListProps["formatMatchInfo"];
  showMatchInfo?: CompositionTeamListProps["showMatchInfo"];
  setShowMatchInfo?: CompositionTeamListProps["setShowMatchInfo"];
  discordSentStatus?: CompositionTeamListProps["discordSentStatus"];
  customMessages?: CompositionTeamListProps["customMessages"];
  setCustomMessages?: CompositionTeamListProps["setCustomMessages"];
  handleSaveCustomMessage?: CompositionTeamListProps["handleSaveCustomMessage"];
  handleSendDiscordMessage?: CompositionTeamListProps["handleSendDiscordMessage"];
  setConfirmResendDialog?: CompositionTeamListProps["setConfirmResendDialog"];
  discordChannels?: CompositionTeamListProps["discordChannels"];
  discordMembers?: CompositionTeamListProps["discordMembers"]; // Optionnel, utilise le store si non fourni
  saveTimeoutRef?: CompositionTeamListProps["saveTimeoutRef"];
  // Props spécifiques au mode "defaults"
  completionThreshold?: number;
  emptyMessage?: string;
}

/**
 * Composant pour gérer le rendu des tabs masculin/féminin avec CompositionTeamList
 */
export function CompositionTabsContent(props: CompositionTabsContentProps) {
  const {
    mode,
    tabValue,
    prefix,
    isParis,
    equipesByType,
    selectedEpreuve,
    players,
    compositions,
    defaultCompositions,
    selectedJournee,
    selectedPhase,
    tabValueProp,
    defaultCompositionTab,
    draggedPlayerId,
    dragOverTeamId,
    teamValidationErrors,
    defaultCompositionErrors,
    availabilities,
    onRemovePlayer,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDragLeave,
    onDrop,
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
    discordMembers,
    saveTimeoutRef,
    completionThreshold,
    emptyMessage,
  } = props;

  // Calculer les équipes à afficher pour le tab masculin
  const getMasculinEquipes = () => {
    if (isParis) {
      return [...equipesByType.masculin, ...equipesByType.feminin];
    }
    return equipesByType.masculin;
  };

  const masculinEquipes = getMasculinEquipes();
  const hasMasculinEquipes = masculinEquipes.length > 0;

  // Construire les props pour CompositionTeamList de manière conditionnelle
  const buildTeamListProps = (equipes: EquipeWithMatches[]) => {
    const baseProps: CompositionTeamListProps = {
      equipes,
      players,
      draggedPlayerId,
      dragOverTeamId,
      mode,
      onRemovePlayer,
      onDragStart,
      onDragEnd,
    };

    // Ajouter les props optionnelles seulement si elles sont fournies (pas undefined)
    if (selectedEpreuve !== undefined) {
      baseProps.selectedEpreuve = selectedEpreuve;
    }
    if (selectedJournee !== undefined) {
      baseProps.selectedJournee = selectedJournee;
    }
    if (selectedPhase !== undefined) {
      baseProps.selectedPhase = selectedPhase;
    }
    if (isParis !== undefined) {
      baseProps.isParis = isParis;
    }

    if (tabValueProp !== undefined) {
      baseProps.tabValue = tabValueProp;
    }
    if (defaultCompositionTab !== undefined) {
      baseProps.defaultCompositionTab = defaultCompositionTab;
    }

    if (compositions !== undefined) {
      baseProps.compositions = compositions;
    }
    if (defaultCompositions !== undefined) {
      baseProps.defaultCompositions = defaultCompositions;
    }
    if (teamValidationErrors !== undefined) {
      baseProps.teamValidationErrors = teamValidationErrors;
    }
    if (defaultCompositionErrors !== undefined) {
      baseProps.defaultCompositionErrors = defaultCompositionErrors;
    }
    if (availabilities !== undefined) {
      baseProps.availabilities = availabilities;
    }
    if (onDragOver !== undefined) {
      baseProps.onDragOver = onDragOver;
    }
    if (onDragLeave !== undefined) {
      baseProps.onDragLeave = onDragLeave;
    }
    if (onDrop !== undefined) {
      baseProps.onDrop = onDrop;
    }

    // Props spécifiques au mode "daily"
    if (mode === "daily") {
      if (formatMatchInfo !== undefined) {
        baseProps.formatMatchInfo = formatMatchInfo;
      }
      if (showMatchInfo !== undefined) {
        baseProps.showMatchInfo = showMatchInfo;
      }
      if (setShowMatchInfo !== undefined) {
        baseProps.setShowMatchInfo = setShowMatchInfo;
      }
      if (discordSentStatus !== undefined) {
        baseProps.discordSentStatus = discordSentStatus;
      }
      if (customMessages !== undefined) {
        baseProps.customMessages = customMessages;
      }
      if (setCustomMessages !== undefined) {
        baseProps.setCustomMessages = setCustomMessages;
      }
      if (handleSaveCustomMessage !== undefined) {
        baseProps.handleSaveCustomMessage = handleSaveCustomMessage;
      }
      if (handleSendDiscordMessage !== undefined) {
        baseProps.handleSendDiscordMessage = handleSendDiscordMessage;
      }
      if (setConfirmResendDialog !== undefined) {
        baseProps.setConfirmResendDialog = setConfirmResendDialog;
      }
      if (discordChannels !== undefined) {
        baseProps.discordChannels = discordChannels;
      }
      if (discordMembers !== undefined) {
        baseProps.discordMembers = discordMembers;
      }
      if (saveTimeoutRef !== undefined) {
        baseProps.saveTimeoutRef = saveTimeoutRef;
      }
    }

    // Props spécifiques au mode "defaults"
    if (mode === "defaults" && completionThreshold !== undefined) {
      baseProps.completionThreshold = completionThreshold;
    }

    return baseProps;
  };

  return (
    <>
      <CompositionTabPanel value={tabValue} index={0} prefix={prefix}>
        {!hasMasculinEquipes && emptyMessage ? (
          <Typography variant="body2" color="text.secondary">
            {emptyMessage}
          </Typography>
        ) : (
          <CompositionTeamList {...buildTeamListProps(masculinEquipes)} />
        )}
      </CompositionTabPanel>

      {!isParis && (
        <CompositionTabPanel value={tabValue} index={1} prefix={prefix}>
          <CompositionTeamList {...buildTeamListProps(equipesByType.feminin)} />
        </CompositionTabPanel>
      )}
    </>
  );
}

