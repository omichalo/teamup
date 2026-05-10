"use client";

import React from "react";
import { Box, Chip, IconButton, Tooltip, Typography } from "@mui/material";
import {
  AlternateEmail,
  CheckCircle,
  Message,
  Warning,
} from "@mui/icons-material";
import { EquipeWithMatches } from "@/hooks/useTeamData";
import { ChampionshipType, Match } from "@/types";
import { Player } from "@/types/team-management";
import { TeamCompositionCard } from "@/components/compositions/TeamCompositionCard";
import { PoolRankingPopover } from "@/components/compositions/PoolRankingPopover";
import { PreviousMatchesOpponents } from "@/components/compositions/PreviousMatchesOpponents";
import { DiscordMatchMessageCard } from "@/components/compositions/DiscordMatchMessageCard";
import { EpreuveType, isParisEpreuve } from "@/lib/shared/epreuve-utils";
import { calculateFutureBurnout, extractTeamNumber, isMatchPlayed } from "@/lib/compositions/validators";
import { getPlayersFromMatch } from "@/lib/compositions/validators/team-utils";
import type { MentionAnchorState } from "@/lib/compositions/mention-autocomplete";
import type { MentionableMember } from "@/components/compositions/MentionSuggestions";
import type { DiscordSentState } from "@/lib/compositions/discord-send";

interface TeamCompositionRowProps {
  equipe: EquipeWithMatches;
  teamAvailabilityMap: Record<
    string,
    { available?: boolean; fridayAvailable?: boolean; saturdayAvailable?: boolean }
  >;
  championshipType: ChampionshipType;
  selectedEpreuve: EpreuveType | null;
  selectedPhase: "aller" | "retour" | null;
  selectedJournee: number | null;
  players: Player[];
  compositions: Record<string, string[]>;
  draggedPlayerId: string | null;
  dragOverTeamId: string | null;
  canDropPlayer: (playerId: string, teamId: string) => { canAssign: boolean; reason?: string };
  onDragOver: (event: React.DragEvent, teamId: string) => void;
  onDragLeave: () => void;
  onDrop: (event: React.DragEvent, teamId: string) => void;
  onPlayerDragStart: (event: React.DragEvent, playerId: string) => void;
  onPlayerDragEnd: () => void;
  getMaxPlayersForTeam: (equipe: EquipeWithMatches) => number;
  getMatchForTeam: (equipe: EquipeWithMatches) => Match | null;
  formatMatchInfo: (
    match: Match | null,
    teamPlayers: Player[],
    teamLocationId?: string,
    teamName?: string,
    isFemale?: boolean,
    epreuve?: EpreuveType | null
  ) => string | null;
  getDiscordStatus: (player: Player) => "none" | "invalid" | "valid";
  teamValidationError: { reason: string; offendingPlayerIds?: string[] } | undefined;
  discordSentStatus: DiscordSentState | undefined;
  showMatchInfo: boolean;
  onToggleMatchInfo: (teamId: string) => void;
  locations: Array<{ id: string; name: string }>;
  discordChannels: Array<{ id: string; name: string }>;
  sendingDiscord: boolean;
  customMessageValue: string;
  mentionAnchor: MentionAnchorState | null;
  mentionQuery: string;
  discordMembers: MentionableMember[];
  onCustomMessageChange: (
    teamId: string,
    value: string,
    target: HTMLInputElement | HTMLTextAreaElement,
    cursorPos: number
  ) => void;
  onCustomMessageKeyDown: (teamId: string, event: React.KeyboardEvent) => void;
  onCustomMessageBlur: (teamId: string, event: React.FocusEvent) => void;
  onSelectMention: (teamId: string, startPos: number, member: MentionableMember) => void;
  onOpenResendDialog: (teamId: string, matchInfo: string, channelId: string | undefined) => void;
  onSendDiscordMessage: (
    teamId: string,
    matchInfo: string,
    journee: number | null,
    phase: string | null,
    channelId: string | undefined
  ) => void;
  onRemovePlayer: (teamId: string, playerId: string) => void;
}

export function TeamCompositionRow({
  equipe,
  teamAvailabilityMap,
  championshipType,
  selectedEpreuve,
  selectedPhase,
  selectedJournee,
  players,
  compositions,
  draggedPlayerId,
  dragOverTeamId,
  canDropPlayer,
  onDragOver,
  onDragLeave,
  onDrop,
  onPlayerDragStart,
  onPlayerDragEnd,
  getMaxPlayersForTeam,
  getMatchForTeam,
  formatMatchInfo,
  getDiscordStatus,
  teamValidationError,
  discordSentStatus,
  showMatchInfo,
  onToggleMatchInfo,
  locations,
  discordChannels,
  sendingDiscord,
  customMessageValue,
  mentionAnchor,
  mentionQuery,
  discordMembers,
  onCustomMessageChange,
  onCustomMessageKeyDown,
  onCustomMessageBlur,
  onSelectMention,
  onOpenResendDialog,
  onSendDiscordMessage,
  onRemovePlayer,
}: TeamCompositionRowProps) {
  const match = getMatchForTeam(equipe);
  const matchPlayed = isMatchPlayed(match);
  const teamPlayers = matchPlayed
    ? getPlayersFromMatch(match, players)
    : (compositions[equipe.team.id] || [])
        .map((playerId) => players.find((p) => p.id === playerId))
        .filter((p): p is Player => p !== undefined);
  const teamPlayersData =
    Array.isArray(teamPlayers) && teamPlayers.every((p) => "id" in p)
      ? teamPlayers
      : [];

  const validationError = teamValidationError?.reason;
  const offendingPlayerIds = teamValidationError?.offendingPlayerIds ?? [];
  const isDragOver =
    !matchPlayed && draggedPlayerId && dragOverTeamId === equipe.team.id;
  const dropCheck =
    !matchPlayed && draggedPlayerId && dragOverTeamId === equipe.team.id
      ? canDropPlayer(draggedPlayerId, equipe.team.id)
      : { canAssign: true, reason: undefined };
  const canDrop = matchPlayed ? false : dropCheck.canAssign;
  const dragHandlers = matchPlayed
    ? {}
    : {
        onDragOver: (event: React.DragEvent) => onDragOver(event, equipe.team.id),
        onDragLeave,
        onDrop: (event: React.DragEvent) => onDrop(event, equipe.team.id),
      };

  const isFemaleTeam = equipe.matches.some((item) => item.isFemale === true);
  const matchInfo = formatMatchInfo(
    match,
    teamPlayersData,
    equipe.team.location,
    equipe.team.name,
    isFemaleTeam,
    selectedEpreuve
  );

  const renderPlayerIndicators = (player: Player) => {
    const phase = selectedPhase || "aller";
    const isParis = isParisEpreuve(selectedEpreuve) && championshipType === "masculin";
    const burnedTeam = isParis
      ? player.highestTeamNumberByPhaseParis?.[phase]
      : championshipType === "masculin"
      ? player.highestMasculineTeamNumberByPhase?.[phase]
      : player.highestFeminineTeamNumberByPhase?.[phase];
    const teamNumber = extractTeamNumber(equipe.team.name);
    const matchesByTeamByPhase = isParis
      ? player.matchesByTeamByPhaseParis?.[phase]
      : championshipType === "masculin"
      ? player.masculineMatchesByTeamByPhase?.[phase]
      : player.feminineMatchesByTeamByPhase?.[phase];
    const futureBurnedTeam =
      championshipType === "masculin" && teamNumber > 0
        ? calculateFutureBurnout(matchesByTeamByPhase, teamNumber, championshipType)
        : null;
    const willBeBurned =
      futureBurnedTeam !== null &&
      (burnedTeam === null || burnedTeam === undefined || futureBurnedTeam !== burnedTeam);
    const availability = teamAvailabilityMap[player.id];
    const isPlayerAvailable = availability?.available === true;
    const showUnavailableIndicator = !isPlayerAvailable;
    const showJ2Indicator =
      offendingPlayerIds.includes(player.id) &&
      (validationError?.toLowerCase() || "").includes("journée 2") &&
      isPlayerAvailable;

    return (
      <>
        {player.nationality === "C" && <Chip label="EUR" size="small" color="info" variant="outlined" sx={{ height: 18, fontSize: "0.65rem" }} />}
        {player.nationality === "ETR" && <Chip label="ETR" size="small" color="warning" variant="outlined" sx={{ height: 18, fontSize: "0.65rem" }} />}
        {burnedTeam !== undefined && burnedTeam !== null && (
          <Chip label={`Brûlé Éq. ${burnedTeam}`} size="small" color="error" variant="outlined" sx={{ height: 18, fontSize: "0.65rem" }} />
        )}
        {willBeBurned && futureBurnedTeam !== null && (
          <Chip
            label={`Sera brûlé Éq. ${futureBurnedTeam}`}
            size="small"
            color="warning"
            variant="outlined"
            sx={{ height: 18, fontSize: "0.65rem" }}
          />
        )}
        {showUnavailableIndicator && <Chip label="Indispo" size="small" color="error" variant="filled" sx={{ height: 18, fontSize: "0.65rem" }} />}
        {showJ2Indicator && <Chip label="J2" size="small" color="error" variant="filled" sx={{ height: 18, fontSize: "0.65rem" }} />}
        {player.isTemporary && <Chip label="Temporaire" size="small" color="error" variant="outlined" sx={{ height: 18, fontSize: "0.65rem" }} />}
        {(() => {
          const discordStatus = getDiscordStatus(player);
          if (discordStatus === "none") {
            return (
              <Tooltip title="Aucun login Discord configuré">
                <Chip icon={<AlternateEmail fontSize="small" />} label="Pas Discord" size="small" color="default" variant="outlined" sx={{ height: 18, fontSize: "0.65rem" }} />
              </Tooltip>
            );
          }
          if (discordStatus === "invalid") {
            return (
              <Tooltip title="Au moins un login Discord n'existe plus sur le serveur">
                <Chip icon={<Warning fontSize="small" />} label="Discord invalide" size="small" color="warning" variant="outlined" sx={{ height: 18, fontSize: "0.65rem" }} />
              </Tooltip>
            );
          }
          return null;
        })()}
      </>
    );
  };

  return (
    <Box key={equipe.team.id} sx={{ display: "flex", gap: 2, alignItems: "flex-start", mb: 2 }}>
      <Box sx={{ flex: 1 }}>
        <TeamCompositionCard
          equipe={equipe}
          players={teamPlayersData}
          onRemovePlayer={(playerId) => onRemovePlayer(equipe.team.id, playerId)}
          onPlayerDragStart={(event, playerId) => onPlayerDragStart(event, playerId)}
          onPlayerDragEnd={onPlayerDragEnd}
          isDragOver={Boolean(isDragOver)}
          canDrop={canDrop}
          dropReason={dropCheck.reason}
          draggedPlayerId={draggedPlayerId}
          dragOverTeamId={dragOverTeamId}
          matchPlayed={matchPlayed}
          selectedEpreuve={selectedEpreuve}
          maxPlayers={getMaxPlayersForTeam(equipe)}
          {...dragHandlers}
          additionalHeader={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {discordSentStatus?.sent && (
                <Chip
                  icon={<CheckCircle sx={{ fontSize: 16 }} />}
                  label="Message envoyé"
                  size="small"
                  color="success"
                  variant="filled"
                  sx={{ fontWeight: 600 }}
                />
              )}
              {validationError && <Chip label="Invalide" size="small" color="error" variant="filled" />}
              {matchInfo && !matchPlayed && (
                <Tooltip title={showMatchInfo ? "Masquer le message" : "Afficher le message"}>
                  <span>
                    <IconButton size="small" onClick={() => onToggleMatchInfo(equipe.team.id)}>
                      <Message fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              )}
              <Tooltip title="Voir le classement de la poule">
                <span>
                  <PoolRankingPopover
                    teamId={equipe.team.id}
                    teamName={equipe.team.name}
                    phase={selectedPhase}
                    opponentTeamName={match?.opponent ?? match?.opponentClub ?? null}
                  />
                </span>
              </Tooltip>
              {(match?.opponent ?? match?.opponentClub) && (
                <PreviousMatchesOpponents
                  teamId={equipe.team.id}
                  phase={selectedPhase}
                  opponentName={match?.opponent ?? match?.opponentClub ?? null}
                  maxMatches={10}
                />
              )}
            </Box>
          }
          renderPlayerIndicators={renderPlayerIndicators}
          renderPlayerSecondary={(player) =>
            player.points !== undefined && player.points !== null
              ? `${player.points} points`
              : "Points non disponibles"
          }
        />
        {validationError && (
          <Typography variant="caption" color="error" sx={{ mt: 1, display: "block" }}>
            {validationError}
          </Typography>
        )}
      </Box>
      {matchInfo && !matchPlayed && showMatchInfo && (
        <DiscordMatchMessageCard
          teamId={equipe.team.id}
          matchInfo={matchInfo}
          channelName={
            equipe.team.discordChannelId
              ? discordChannels.find((c) => c.id === equipe.team.discordChannelId)?.name
              : undefined
          }
          hasDiscordChannel={Boolean(equipe.team.discordChannelId)}
          hasLocationConfigured={Boolean(
            equipe.team.location && locations.find((l) => l.id === equipe.team.location)
          )}
          sentStatus={discordSentStatus ?? { sent: false }}
          sending={sendingDiscord}
          customMessageValue={customMessageValue}
          mentionAnchor={mentionAnchor}
          mentionQuery={mentionQuery}
          discordMembers={discordMembers}
          onClose={() => onToggleMatchInfo(equipe.team.id)}
          onSend={() => {
            if (!matchInfo) return;
            if (discordSentStatus?.sent) {
              onOpenResendDialog(equipe.team.id, matchInfo, equipe.team.discordChannelId);
              return;
            }
            onSendDiscordMessage(
              equipe.team.id,
              matchInfo,
              selectedJournee,
              selectedPhase,
              equipe.team.discordChannelId
            );
          }}
          onChange={onCustomMessageChange}
          onKeyDown={onCustomMessageKeyDown}
          onBlur={onCustomMessageBlur}
          onSelectMention={onSelectMention}
        />
      )}
    </Box>
  );
}
