"use client";

import React from "react";
import {
  Badge,
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Accessible as AccessibleIcon,
  AlternateEmail as AlternateEmailIcon,
  SportsTennis as SportsTennisIcon,
} from "@mui/icons-material";
import { Player } from "@/types/team-management";

interface PlayersActiveTableProps {
  players: Player[];
  currentPhase: "aller" | "retour";
  hasInvalidDiscordMentions: (player: Player) => boolean;
  onEditPlayer: (player: Player) => void;
  onToggleParticipation: (player: Player, isParticipating: boolean) => void;
  onToggleParticipationParis: (
    player: Player,
    inChampionshipParis: boolean
  ) => void;
  onToggleWheelchair: (player: Player) => void;
}

function BurnoutCell({
  burnedTeam,
  matchesByTeam,
  phaseLabel,
  color,
}: {
  burnedTeam: number | undefined;
  matchesByTeam: Record<string, number> | undefined;
  phaseLabel: string;
  color: "warning" | "secondary";
}) {
  const hasData =
    burnedTeam !== undefined ||
    (matchesByTeam && Object.keys(matchesByTeam).length > 0);

  if (!hasData) {
    return (
      <Typography variant="body2" color="text.secondary">
        -
      </Typography>
    );
  }

  return (
    <Tooltip
      title={
        <Box>
          {burnedTeam ? (
            <>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: "bold" }}>
                Brule dans l&apos;equipe {burnedTeam} ({phaseLabel})
              </Typography>
              <Typography variant="caption" sx={{ display: "block", mb: 1 }}>
                Ne peut pas jouer dans les equipes inferieures
              </Typography>
            </>
          ) : null}
          {matchesByTeam && Object.keys(matchesByTeam).length > 0 ? (
            <>
              <Typography
                variant="caption"
                sx={{ display: "block", mb: 0.5, fontWeight: "bold" }}
              >
                Matchs joues par equipe ({phaseLabel}):
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                {Object.entries(matchesByTeam)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([team, count]) => (
                    <Typography
                      key={team}
                      component="li"
                      variant="caption"
                      sx={{ display: "list-item" }}
                    >
                      Equipe {team}: {count} match{count > 1 ? "s" : ""}
                    </Typography>
                  ))}
              </Box>
            </>
          ) : null}
        </Box>
      }
      arrow
      placement="top"
    >
      <Chip
        label={burnedTeam ? `Equipe ${burnedTeam}` : "Voir stats"}
        color={color}
        size="small"
        variant="outlined"
      />
    </Tooltip>
  );
}

export function PlayersActiveTable({
  players,
  currentPhase,
  hasInvalidDiscordMentions,
  onEditPlayer,
  onToggleParticipation,
  onToggleParticipationParis,
  onToggleWheelchair,
}: PlayersActiveTableProps) {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Nom</TableCell>
            <TableCell>Licence</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Points</TableCell>
            <TableCell>Numerote</TableCell>
            <TableCell>Genre</TableCell>
            <TableCell>Nationalite</TableCell>
            <TableCell>Participation</TableCell>
            <TableCell>Brulage Masculin</TableCell>
            <TableCell>Brulage Feminin</TableCell>
            <TableCell>Brulage (Paris)</TableCell>
            <TableCell>Fauteuil</TableCell>
            <TableCell>Discord</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {players.map((player) => (
            <TableRow key={player.id}>
              <TableCell>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2" fontWeight="medium">
                    {player.firstName} {player.name}
                  </Typography>
                  {player.hasPlayedAtLeastOneMatch && (
                    <Chip
                      icon={<SportsTennisIcon />}
                      label="A joue"
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                  )}
                  {player.hasPlayedAtLeastOneMatchParis && (
                    <Chip
                      icon={<SportsTennisIcon />}
                      label="A joue Paris"
                      size="small"
                      color="secondary"
                      variant="outlined"
                    />
                  )}
                </Box>
              </TableCell>
              <TableCell>{player.license}</TableCell>
              <TableCell>
                <Chip
                  label={player.typeLicence || "N/A"}
                  color={
                    player.typeLicence === "T"
                      ? "success"
                      : player.typeLicence === "P"
                      ? "info"
                      : player.typeLicence === "A"
                      ? "warning"
                      : "default"
                  }
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Typography variant="body2" fontWeight="medium">
                  {player.points || 0}
                </Typography>
              </TableCell>
              <TableCell>
                {player.place ? (
                  <Chip label={`N°${player.place}`} color="primary" size="small" />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    -
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                <Chip
                  label={player.gender === "M" ? "Masculin" : "Feminin"}
                  color={player.gender === "M" ? "primary" : "secondary"}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Chip
                  label={
                    player.nationality === "FR"
                      ? "Francaise"
                      : player.nationality === "C"
                      ? "Europeenne"
                      : "Etrangere"
                  }
                  variant="outlined"
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Box display="flex" flexDirection="column" gap={1}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Switch
                      size="small"
                      checked={player.participation?.championnat || false}
                      onChange={(e) =>
                        onToggleParticipation(player, e.target.checked)
                      }
                    />
                    <Typography variant="caption" color="text.secondary">
                      {player.participation?.championnat ? "Oui" : "Non"}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Switch
                      size="small"
                      checked={player.participation?.championnatParis || false}
                      onChange={(e) =>
                        onToggleParticipationParis(player, e.target.checked)
                      }
                    />
                    <Typography variant="caption" color="text.secondary">
                      Paris: {player.participation?.championnatParis ? "Oui" : "Non"}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell>
                <BurnoutCell
                  burnedTeam={player.highestMasculineTeamNumberByPhase?.[currentPhase]}
                  matchesByTeam={player.masculineMatchesByTeamByPhase?.[currentPhase]}
                  phaseLabel={`Masculin - Phase ${currentPhase}`}
                  color="warning"
                />
              </TableCell>
              <TableCell>
                <BurnoutCell
                  burnedTeam={player.highestFeminineTeamNumberByPhase?.[currentPhase]}
                  matchesByTeam={player.feminineMatchesByTeamByPhase?.[currentPhase]}
                  phaseLabel={`Feminin - Phase ${currentPhase}`}
                  color="secondary"
                />
              </TableCell>
              <TableCell>
                <BurnoutCell
                  burnedTeam={player.highestTeamNumberByPhaseParis?.[currentPhase]}
                  matchesByTeam={player.matchesByTeamByPhaseParis?.[currentPhase]}
                  phaseLabel={`Paris - Phase ${currentPhase}`}
                  color="secondary"
                />
              </TableCell>
              <TableCell>
                <Tooltip
                  title={
                    player.isWheelchair
                      ? "Joueur en fauteuil"
                      : "Cliquer pour indiquer que le joueur est en fauteuil"
                  }
                >
                  <IconButton
                    onClick={() => {
                      void onToggleWheelchair(player);
                    }}
                    size="small"
                    sx={{
                      color: player.isWheelchair ? "primary.main" : "action.disabled",
                    }}
                  >
                    <AccessibleIcon />
                  </IconButton>
                </Tooltip>
              </TableCell>
              <TableCell>
                <Badge
                  badgeContent={player.discordMentions?.length || 0}
                  color={hasInvalidDiscordMentions(player) ? "warning" : "primary"}
                  overlap="rectangular"
                  anchorOrigin={{ vertical: "top", horizontal: "right" }}
                >
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AlternateEmailIcon />}
                    onClick={() => onEditPlayer(player)}
                  >
                    Discord
                  </Button>
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
