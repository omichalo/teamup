"use client";

import { Box, Typography, Chip, Card, IconButton, Tooltip } from "@mui/material";
import { Message, Close, Send } from "@mui/icons-material";
import type { EquipeWithMatches } from "@/hooks/useEquipesWithMatches";
import type { Player } from "@/types/team-management";
import type { EpreuveType } from "@/lib/shared/epreuve-utils";
import { TeamCompositionCard } from "./TeamCompositionCard";
import { PlayerBurnoutIndicators } from "./PlayerBurnoutIndicators";
import { DiscordMessageEditor } from "./DiscordMessageEditor";
import { useCompositionTeamList } from "@/hooks/useCompositionTeamList";
import { isParisChampionship as isParisChampionshipValidation, getMatchForTeamAndJournee } from "@/lib/compositions/validation";
import type { DiscordMember } from "@/types/discord";
import { useSelectionFromStore, useDiscordFromStore } from "@/hooks/useStoreSelectors";

export interface CompositionTeamListProps {
  equipes: EquipeWithMatches[];
  players: Player[];
  compositions?: Record<string, string[]>;
  defaultCompositions?: {
    masculin: Record<string, string[]>;
    feminin: Record<string, string[]>;
  };
  selectedEpreuve?: EpreuveType | null; // Optionnel, utilise le store si non fourni
  selectedJournee?: number | null; // Optionnel, utilise le store si non fourni
  selectedPhase?: "aller" | "retour" | null; // Optionnel, utilise le store si non fourni
  tabValue?: number;
  defaultCompositionTab?: "masculin" | "feminin";
  isParis?: boolean; // Optionnel, utilise le store si non fourni
  draggedPlayerId: string | null;
  dragOverTeamId: string | null;
  teamValidationErrors?: Record<string, { reason?: string; offendingPlayerIds?: string[] } | undefined>;
  defaultCompositionErrors?: Record<string, string | undefined>;
  availabilities?: {
    masculin?: Record<string, { available?: boolean; comment?: string }>;
    feminin?: Record<string, { available?: boolean; comment?: string }>;
  };
  mode: "daily" | "defaults";
  onRemovePlayer: (teamId: string, playerId: string) => void;
  onDragStart: (event: React.DragEvent, playerId: string) => void;
  onDragEnd: () => void;
  onDragOver?: (event: React.DragEvent, teamId: string) => void;
  onDragLeave?: () => void;
  onDrop?: (event: React.DragEvent, teamId: string) => void;
  // Props spécifiques au mode "daily"
  formatMatchInfo?: (
    match: import("@/types").Match | null,
    teamPlayers: Player[],
    teamLocationId?: string,
    teamName?: string,
    isFemale?: boolean,
    epreuve?: EpreuveType | null
  ) => string | null;
  showMatchInfo?: Record<string, boolean>;
  setShowMatchInfo?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  discordSentStatus?: Record<string, { sent: boolean; sentAt?: string; customMessage?: string }>;
  customMessages?: Record<string, string>;
  setCustomMessages?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleSaveCustomMessage?: (teamId: string, value: string, journee: number | null, phase: string | null) => void;
  handleSendDiscordMessage?: (teamId: string, content: string, journee: number | null, phase: string | null, channelId?: string) => Promise<void>;
  setConfirmResendDialog?: React.Dispatch<React.SetStateAction<{
    open: boolean;
    teamId: string | null;
    matchInfo: string | null;
    channelId?: string;
  }>>;
  discordChannels?: Array<{ id: string; name: string; type?: number }>;
  discordMembers?: DiscordMember[]; // Optionnel, utilise le store si non fourni
  saveTimeoutRef?: React.MutableRefObject<Record<string, NodeJS.Timeout>>;
  completionThreshold?: number;
}

/**
 * Composant pour afficher la liste des équipes avec leurs compositions
 */
export function CompositionTeamList(props: CompositionTeamListProps) {
  // Utiliser le store pour les sélections si non fournies en props
  const {
    selectedEpreuve: selectedEpreuveFromStore,
    selectedPhase: selectedPhaseFromStore,
    selectedJournee: selectedJourneeFromStore,
    isParis: isParisFromStore,
  } = useSelectionFromStore();

  // Utiliser le store pour Discord si non fourni en props
  const { discordMembers: discordMembersFromStore } = useDiscordFromStore();

  const {
    equipes,
    players,
    compositions,
    defaultCompositions,
    selectedEpreuve: selectedEpreuveProp,
    selectedJournee: selectedJourneeProp,
    selectedPhase: selectedPhaseProp,
    tabValue = 0,
    defaultCompositionTab,
    isParis: isParisProp,
    draggedPlayerId,
    dragOverTeamId,
    teamValidationErrors,
    defaultCompositionErrors,
    availabilities,
    mode,
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
    discordMembers: discordMembersProp,
    saveTimeoutRef,
    completionThreshold,
  } = props;

  // Utiliser les valeurs des props si fournies, sinon utiliser le store
  const selectedEpreuve: EpreuveType | null = selectedEpreuveProp ?? selectedEpreuveFromStore ?? null;
  const selectedPhase: "aller" | "retour" | null = selectedPhaseProp ?? selectedPhaseFromStore ?? null;
  const selectedJournee: number | null = selectedJourneeProp ?? selectedJourneeFromStore ?? null;
  const isParis: boolean = isParisProp ?? isParisFromStore ?? false;
  const discordMembers: DiscordMember[] = discordMembersProp ?? discordMembersFromStore ?? [];

  const { teamsData } = useCompositionTeamList({
    equipes,
    players,
    compositions,
    defaultCompositions,
    selectedEpreuve,
    selectedJournee,
    selectedPhase,
    tabValue,
    defaultCompositionTab,
    isParis,
    draggedPlayerId,
    dragOverTeamId,
    teamValidationErrors: teamValidationErrors as Record<string, { reason?: string; offendingPlayerIds?: string[] }> | undefined,
    defaultCompositionErrors,
    availabilities,
    mode,
  });

  if (equipes.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Aucune équipe
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      {teamsData.map((teamData) => {
        const { equipe, teamPlayers, isDragOver, canDrop, dropReason, validationError, offendingPlayerIds, matchPlayed, maxPlayers, championshipType, isParis: isParisTeam, teamAvailabilityMap } = teamData;

        const dragHandlers = matchPlayed
          ? {}
          : {
              ...(onDragOver ? { onDragOver: (event: React.DragEvent) => onDragOver(event, equipe.team.id) } : {}),
              ...(onDragLeave ? { onDragLeave } : {}),
              ...(onDrop ? { onDrop: (event: React.DragEvent) => onDrop(event, equipe.team.id) } : {}),
            };

        const isFemaleTeam = equipe.matches.some((match) => match.isFemale === true);
        const match = mode === "daily" && selectedJournee && selectedPhase
          ? (getMatchForTeamAndJournee(equipe, selectedJournee, selectedPhase) ?? null)
          : null;
        const matchInfo = mode === "daily" && formatMatchInfo && match
          ? formatMatchInfo(
              match,
              teamPlayers,
              equipe.team.location,
              equipe.team.name,
              isFemaleTeam,
              selectedEpreuve
            )
          : null;

        const isParisMatch = mode === "defaults" ? isParisChampionshipValidation(equipe) : isParisTeam;

        return (
          <Box
            key={equipe.team.id}
            sx={{
              display: "flex",
              gap: 2,
              alignItems: "flex-start",
              mb: 2,
            }}
          >
            <Box sx={{ flex: 1 }}>
              <TeamCompositionCard
                equipe={equipe}
                players={teamPlayers}
                onRemovePlayer={(playerId) => onRemovePlayer(equipe.team.id, playerId)}
                onPlayerDragStart={onDragStart}
                onPlayerDragEnd={onDragEnd}
                isDragOver={isDragOver}
                canDrop={canDrop}
                dropReason={dropReason}
                draggedPlayerId={draggedPlayerId}
                dragOverTeamId={dragOverTeamId}
                matchPlayed={matchPlayed}
                selectedEpreuve={mode === "daily" ? selectedEpreuve : null}
                maxPlayers={maxPlayers}
                {...(completionThreshold !== undefined ? { completionThreshold } : {})}
                additionalHeader={
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    {validationError && (
                      <Chip
                        label="Invalide"
                        size="small"
                        color="error"
                        variant="filled"
                      />
                    )}
                    {matchInfo && !matchPlayed && mode === "daily" && showMatchInfo && setShowMatchInfo && (
                      <Tooltip
                        title={
                          !equipe.team.discordChannelId
                            ? "Aucun canal Discord configuré pour cette équipe. Configurez-le dans la page des équipes."
                            : showMatchInfo[equipe.team.id]
                            ? "Masquer le message"
                            : "Afficher le message"
                        }
                      >
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setShowMatchInfo((prev) => ({
                                ...prev,
                                [equipe.team.id]: !prev[equipe.team.id],
                              }));
                            }}
                            disabled={!equipe.team.discordChannelId}
                            color={showMatchInfo[equipe.team.id] ? "primary" : "default"}
                          >
                            <Message fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                  </Box>
                }
                renderPlayerIndicators={(player) => {
                  const phase = selectedPhase || "aller";
                  return (
                    <PlayerBurnoutIndicators
                      player={player}
                      equipe={equipe}
                      phase={phase}
                      championshipType={championshipType}
                      isParis={isParisMatch}
                      {...(teamAvailabilityMap ? { teamAvailabilityMap } : {})}
                      {...(offendingPlayerIds.length > 0 ? { offendingPlayerIds } : {})}
                      {...(validationError ? { validationError } : {})}
                      discordMembers={discordMembers || []}
                    />
                  );
                }}
                renderPlayerSecondary={(player) =>
                  player.points !== undefined && player.points !== null
                    ? `${player.points} points`
                    : "Points non disponibles"
                }
                {...dragHandlers}
              />
              {validationError && (
                <Typography
                  variant="caption"
                  color="error"
                  sx={{ mt: 1, display: "block" }}
                >
                  {validationError}
                </Typography>
              )}
            </Box>
            {matchInfo && !matchPlayed && mode === "daily" && showMatchInfo?.[equipe.team.id] && (
              <Card
                elevation={2}
                sx={{
                  minWidth: 300,
                  maxWidth: 400,
                  borderLeft: "4px solid",
                  borderLeftColor: "primary.main",
                  backgroundColor: "action.hover",
                  position: "relative",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 1,
                    pb: 0.5,
                    borderBottom: "1px solid",
                    borderBottomColor: "divider",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Message fontSize="small" color="primary" />
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.25,
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontWeight: 500 }}
                      >
                        Message Discord
                      </Typography>
                      {equipe.team.discordChannelId && discordChannels && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            fontSize: "0.7rem",
                            fontStyle: "italic",
                          }}
                        >
                          Canal: #
                          {discordChannels.find(
                            (c) => c.id === equipe.team.discordChannelId
                          )?.name || "Canal configuré"}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                    }}
                  >
                    {discordSentStatus?.[equipe.team.id]?.sent && (
                      <Chip
                        label="Envoyé"
                        size="small"
                        color="success"
                        variant="outlined"
                        sx={{
                          height: 20,
                          fontSize: "0.65rem",
                        }}
                        title={
                          discordSentStatus[equipe.team.id]?.sentAt
                            ? `Envoyé le ${new Date(
                                discordSentStatus[equipe.team.id].sentAt!
                              ).toLocaleString("fr-FR")}`
                            : "Message déjà envoyé"
                        }
                      />
                    )}
                    <Tooltip
                      title={
                        !equipe.team.discordChannelId
                          ? "Aucun canal Discord configuré pour cette équipe. Configurez-le dans la page des équipes."
                          : discordSentStatus?.[equipe.team.id]?.sent
                          ? "Renvoyer le message sur Discord"
                          : "Envoyer le message sur Discord"
                      }
                    >
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => {
                            if (!matchInfo || !handleSendDiscordMessage || !setConfirmResendDialog) return;
                            if (discordSentStatus?.[equipe.team.id]?.sent) {
                              setConfirmResendDialog({
                                open: true,
                                teamId: equipe.team.id,
                                matchInfo,
                                ...(equipe.team.discordChannelId
                                  ? { channelId: equipe.team.discordChannelId }
                                  : {}),
                              });
                            } else {
                              handleSendDiscordMessage(
                                equipe.team.id,
                                matchInfo,
                                selectedJournee,
                                selectedPhase,
                                equipe.team.discordChannelId
                              );
                            }
                          }}
                          disabled={!equipe.team.discordChannelId}
                        >
                          <Send fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    {setShowMatchInfo && (
                      <IconButton
                        size="small"
                        onClick={() => {
                          setShowMatchInfo((prev) => ({
                            ...prev,
                            [equipe.team.id]: false,
                          }));
                        }}
                      >
                        <Close fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </Box>
                <Box sx={{ p: 2 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      lineHeight: 1.8,
                      m: 0,
                      mb: 2,
                      color: "text.primary",
                    }}
                  >
                    {matchInfo}
                  </Typography>
                  {customMessages && setCustomMessages && handleSaveCustomMessage && saveTimeoutRef && (
                    <Box sx={{ mt: 1 }}>
                      <DiscordMessageEditor
                        teamId={equipe.team.id}
                        value={customMessages[equipe.team.id] || ""}
                        onChange={(newValue) => {
                          setCustomMessages((prev) => ({
                            ...prev,
                            [equipe.team.id]: newValue,
                          }));
                        }}
                        onSave={(newValue) => {
                          if (selectedJournee && selectedPhase) {
                            handleSaveCustomMessage(
                              equipe.team.id,
                              newValue,
                              selectedJournee,
                              selectedPhase
                            );
                          }
                        }}
                        discordMembers={discordMembers || []}
                        selectedJournee={selectedJournee}
                        selectedPhase={selectedPhase}
                        saveTimeoutRef={saveTimeoutRef}
                        onInsertMention={() => {}}
                      />
                    </Box>
                  )}
                </Box>
              </Card>
            )}
          </Box>
        );
      })}
    </Box>
  );
}


