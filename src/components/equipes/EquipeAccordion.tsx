"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Alert,
  Chip,
  IconButton,
  Popover,
  Tooltip,
} from "@mui/material";
import { SportsTennis, Message, LocationOn, Event, People } from "@mui/icons-material";
import type { EquipeWithMatches } from "@/hooks/useTeamData";
import type { Match } from "@/types";
import { USER_ROLES } from "@/lib/auth/roles";
import { getTeamPhase } from "@/lib/shared/fftt-utils";
import { isParisEpreuve } from "@/lib/shared/epreuve-utils";
import {
  CompositionsTable,
  type MatchCompositionRow,
} from "@/components/compositions/CompositionsTable";
import {
  computeVictoiresDefaitesFromParties,
  playerNameMatches,
} from "@/lib/shared/victoires-defaites";
import { MatchCardCompact } from "@/components/equipes/MatchCardCompact";
import { PoolRankingPopover } from "@/components/compositions/PoolRankingPopover";

export type MatchContextForPopover = {
  teamId: string;
  phase: "aller" | "retour" | null;
};

export interface EquipeAccordionProps {
  equipeWithMatches: EquipeWithMatches;
  epreuve: string;
  locations: Array<{ id: string; name: string }>;
  discordChannels: Array<{ id: string; name: string }>;
  user: { role?: string } | null;
  onOpenLocationDialog: (teamId: string) => void;
  onOpenDiscordChannelDialog: (teamId: string) => void;
  onMatchClick?: (match: Match, context?: MatchContextForPopover) => void;
}

function teamPhaseToApiPhase(
  phaseKind: "phase1" | "phase2" | "sansPhase"
): "aller" | "retour" | null {
  if (phaseKind === "phase1") return "aller";
  if (phaseKind === "phase2") return "retour";
  return null;
}

/** Détermine si notre équipe est côté A à partir de joueursA/joueursB et joueursSQY. */
function ourSideIsA(match: Match): boolean {
  const joueursSQY = match.joueursSQY ?? [];
  const joueursA = match.resultatsIndividuels?.joueursA ?? {};
  const joueursB = match.resultatsIndividuels?.joueursB ?? {};
  if (joueursSQY.length === 0) return true;
  const sqyNormalized = new Set(
    joueursSQY.map((j) =>
      `${(j.prenom ?? "").trim()} ${(j.nom ?? "").trim()}`.trim().toUpperCase().replace(/\s+/g, " ")
    )
  );
  const norm = (s: string) => (s ?? "").trim().toUpperCase().replace(/\s+/g, " ");
  let countA = 0,
    countB = 0;
  for (const k of Object.keys(joueursA)) if (sqyNormalized.has(norm(k))) countA++;
  for (const k of Object.keys(joueursB)) if (sqyNormalized.has(norm(k))) countB++;
  return countA >= countB;
}

type CompositionPlayer = {
  licence?: string;
  nom?: string;
  prenom?: string;
  points?: number | null;
};

function hasNamedPlayers(players: CompositionPlayer[]): boolean {
  return players.some(
    (p) => ((p.nom ?? "").trim().length > 0 || (p.prenom ?? "").trim().length > 0)
  );
}

function getSQYCompositionPlayers(match: Match): CompositionPlayer[] {
  const joueursSQY = (match.joueursSQY ?? []) as CompositionPlayer[];
  if (joueursSQY.length > 0 && hasNamedPlayers(joueursSQY)) {
    return joueursSQY;
  }

  const resultats = match.resultatsIndividuels;
  if (!resultats) return [];

  const joueursA = Object.values(resultats.joueursA ?? {});
  const joueursB = Object.values(resultats.joueursB ?? {});
  if (joueursA.length === 0 && joueursB.length === 0) {
    return [];
  }

  const nomEquipeA = (resultats.nomEquipeA ?? "").toUpperCase();
  const nomEquipeB = (resultats.nomEquipeB ?? "").toUpperCase();
  const sqyInA = nomEquipeA.includes("SQY PING");
  const sqyInB = nomEquipeB.includes("SQY PING");

  if (sqyInA && !sqyInB) return joueursA;
  if (sqyInB && !sqyInA) return joueursB;

  // Fallback défensif si les noms d'équipe sont absents/incohérents.
  return ourSideIsA(match) ? joueursA : joueursB;
}

/**
 * Calcule victoires/défaites par joueur pour un match (simples uniquement, logique partagée avec l'API).
 */
function computeVictoiresDefaitesForMatch(
  match: Match,
  compositionPlayers: CompositionPlayer[]
): Map<string, { victoires: number; defaites: number }> {
  const parties = match.resultatsIndividuels?.parties;
  if (!parties || parties.length === 0 || compositionPlayers.length === 0) {
    return new Map();
  }
  const partieLike = parties.map((p) => ({
    joueurA: p.joueurA ?? "",
    joueurB: p.joueurB ?? "",
    scoreA: p.scoreA,
    scoreB: p.scoreB,
  }));
  const sideACountsAsOurs = ourSideIsA(match);
  const getPlayerKey = (playerName: string): string | null => {
    const joueur = compositionPlayers.find((j) =>
      playerNameMatches(playerName, j.nom ?? "", j.prenom ?? "")
    );
    if (!joueur) return null;
    return (joueur.licence ?? "").trim() || `${(joueur.nom ?? "").trim()}|${(joueur.prenom ?? "").trim()}`;
  };
  return computeVictoiresDefaitesFromParties(
    partieLike,
    sideACountsAsOurs,
    getPlayerKey
  );
}

export function EquipeAccordion({
  equipeWithMatches,
  epreuve,
  locations,
  discordChannels,
  user,
  onOpenLocationDialog,
  onOpenDiscordChannelDialog,
}: EquipeAccordionProps) {
  const phaseKind = getTeamPhase(equipeWithMatches);
  const poolPhase = teamPhaseToApiPhase(phaseKind);
  const [matchsAnchor, setMatchsAnchor] = useState<HTMLElement | null>(null);
  const [joueursAnchor, setJoueursAnchor] = useState<HTMLElement | null>(null);

  const displayMatches =
    phaseKind === "phase2"
      ? equipeWithMatches.matches.filter((m) => (m.phase || "").toLowerCase() === "retour")
      : phaseKind === "phase1"
        ? equipeWithMatches.matches.filter((m) => (m.phase || "").toLowerCase() === "aller")
        : equipeWithMatches.matches;

  const matchesForTable: MatchCompositionRow[] = React.useMemo(() => {
    const sorted = [...displayMatches].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    return sorted.map((m) => {
      const compositionPlayers = getSQYCompositionPlayers(m);
      const vdByPlayer = computeVictoiresDefaitesForMatch(m, compositionPlayers);
      return {
        date:
          typeof m.date === "string"
            ? m.date
            : new Date(m.date).toISOString().slice(0, 10),
        journee: m.journee,
        otherTeamName: m.opponent || "Adversaire",
        ...(m.score ? { score: m.score } : {}),
        composition: compositionPlayers.map((j) => {
          const key =
            (j.licence ?? "").trim() ||
            `${(j.nom ?? "").trim()}|${(j.prenom ?? "").trim()}`;
          const vd = vdByPlayer.get(key) ?? { victoires: 0, defaites: 0 };
          return {
            nom: j.nom ?? "",
            prenom: j.prenom ?? "",
            points: j.points ?? null,
            ...(j.licence ? { licence: j.licence } : {}),
            victoires: vd.victoires,
            defaites: vd.defaites,
          };
        }),
      };
    });
  }, [displayMatches]);

  const sortedMatches = React.useMemo(
    () => [...displayMatches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [displayMatches]
  );

  const borderColor = isParisEpreuve(epreuve) ? "#9c27b0" : epreuve.includes("Féminin") ? "#f57c00" : "#1976d2";

  return (
    <Box
      sx={{
        mb: 2,
        p: 2,
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
        borderLeft: `4px solid ${borderColor}`,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
        <SportsTennis sx={{ color: borderColor }} />
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="h6">{equipeWithMatches.team.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {equipeWithMatches.team.division}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
            <Typography variant="caption" color="text.secondary">
              Lieu:{" "}
              {equipeWithMatches.team.location
                ? locations.find((l) => l.id === equipeWithMatches.team.location)?.name ||
                  equipeWithMatches.team.location
                : "Non défini"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Discord:{" "}
              {equipeWithMatches.team.discordChannelId
                ? discordChannels.find((c) => c.id === equipeWithMatches.team.discordChannelId)?.name || "Canal configuré"
                : "Non configuré"}
            </Typography>
            {(!equipeWithMatches.team.location || !equipeWithMatches.team.discordChannelId) && (
              <Box sx={{ display: "flex", gap: 0.5, mt: 0.5, flexWrap: "wrap" }}>
                {!equipeWithMatches.team.location && (
                  <Chip label="Sans lieu" size="small" color="warning" variant="outlined" />
                )}
                {!equipeWithMatches.team.discordChannelId && (
                  <Chip label="Sans Discord" size="small" color="info" variant="outlined" />
                )}
              </Box>
            )}
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {user && (user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.COACH) && (
            <>
              <Tooltip title="Modifier le lieu">
                <IconButton
                  size="medium"
                  onClick={() => onOpenLocationDialog(equipeWithMatches.team.id)}
                  aria-label="Modifier le lieu"
                  color="primary"
                >
                  <LocationOn fontSize="medium" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Modifier le canal Discord">
                <IconButton
                  size="medium"
                  onClick={() => onOpenDiscordChannelDialog(equipeWithMatches.team.id)}
                  aria-label="Modifier le canal Discord"
                  color="info"
                >
                  <Message fontSize="medium" />
                </IconButton>
              </Tooltip>
            </>
          )}
          <Tooltip title="Voir les matchs">
            <span>
              <IconButton
                size="medium"
                onClick={(e) => setMatchsAnchor(e.currentTarget)}
                aria-label="Voir les matchs"
                disabled={displayMatches.length === 0}
                color="success"
              >
                <Event fontSize="medium" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Joueurs par journée">
            <span>
              <IconButton
                size="medium"
                onClick={(e) => setJoueursAnchor(e.currentTarget)}
                aria-label="Joueurs par journée"
                disabled={matchesForTable.length === 0}
                color="secondary"
              >
                <People fontSize="medium" />
              </IconButton>
            </span>
          </Tooltip>
          <PoolRankingPopover
            teamId={equipeWithMatches.team.id}
            teamName={equipeWithMatches.team.name}
            phase={poolPhase}
            iconSize="medium"
            iconColor="warning"
          />
        </Box>
      </Box>

      <Popover
        open={Boolean(matchsAnchor)}
        anchorEl={matchsAnchor}
        onClose={() => setMatchsAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{
          sx: { maxWidth: "95vw", width: 720, maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column" },
        }}
      >
        <Box sx={{ p: 2, overflow: "auto", flex: 1 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            Matchs
          </Typography>
          {displayMatches.length === 0 ? (
            <Alert severity="info">Aucun match trouvé pour cette équipe.</Alert>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 1.5,
              }}
            >
              {sortedMatches.map((match, index) => (
                <MatchCardCompact key={`${match.ffttId}_${index}`} match={match} />
              ))}
            </Box>
          )}
        </Box>
      </Popover>

      <Popover
        open={Boolean(joueursAnchor)}
        anchorEl={joueursAnchor}
        onClose={() => setJoueursAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{
          sx: { maxWidth: "95vw", maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column" },
        }}
      >
        <Box sx={{ p: 2, overflow: "auto", flex: 1 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            Joueurs par journée
          </Typography>
          {matchesForTable.length === 0 ? (
            <Alert severity="info">Aucune composition disponible.</Alert>
          ) : (
            <CompositionsTable matches={matchesForTable} />
          )}
        </Box>
      </Popover>
    </Box>
  );
}

