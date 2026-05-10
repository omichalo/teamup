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
  Delete as DeleteIcon,
  Edit as EditIcon,
  SportsTennis as SportsTennisIcon,
} from "@mui/icons-material";
import { Player } from "@/types/team-management";

interface PlayersBasicTableProps {
  players: Player[];
  licenseMode: "normal" | "withoutLicense" | "temporary";
  showActions?: boolean;
  deletingPlayerId?: string | null;
  hasInvalidDiscordMentions: (player: Player) => boolean;
  onEditPlayer: (player: Player) => void;
  onDeletePlayer?: (player: Player) => void;
  onToggleParticipation: (player: Player, isParticipating: boolean) => void;
  onToggleParticipationParis: (
    player: Player,
    inChampionshipParis: boolean
  ) => void;
  onToggleWheelchair: (player: Player) => void;
}

export function PlayersBasicTable({
  players,
  licenseMode,
  showActions = false,
  deletingPlayerId = null,
  hasInvalidDiscordMentions,
  onEditPlayer,
  onDeletePlayer,
  onToggleParticipation,
  onToggleParticipationParis,
  onToggleWheelchair,
}: PlayersBasicTableProps) {
  const renderLicenseCell = (player: Player) => {
    if (licenseMode === "withoutLicense") {
      return <Chip label="Sans licence" color="warning" size="small" />;
    }
    if (licenseMode === "temporary") {
      return <Chip label="Temporaire" color="error" size="small" />;
    }
    return player.license;
  };

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Nom</TableCell>
            <TableCell>Licence</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Points</TableCell>
            <TableCell>Numéroté</TableCell>
            <TableCell>Genre</TableCell>
            <TableCell>Nationalité</TableCell>
            <TableCell>Participation</TableCell>
            <TableCell>Fauteuil</TableCell>
            <TableCell>Discord</TableCell>
            {showActions && <TableCell>Actions</TableCell>}
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
                      label="A joué"
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                  )}
                  {player.hasPlayedAtLeastOneMatchParis && (
                    <Chip
                      icon={<SportsTennisIcon />}
                      label="A joué Paris"
                      size="small"
                      color="secondary"
                      variant="outlined"
                    />
                  )}
                </Box>
              </TableCell>
              <TableCell>{renderLicenseCell(player)}</TableCell>
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
                  label={player.gender === "M" ? "Masculin" : "Féminin"}
                  color={player.gender === "M" ? "primary" : "secondary"}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Chip
                  label={
                    player.nationality === "FR"
                      ? "Française"
                      : player.nationality === "C"
                      ? "Européenne"
                      : "Étrangère"
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
              {showActions && (
                <TableCell>
                  <Box display="flex" gap={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={() => onEditPlayer(player)}
                    >
                      Modifier
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => onDeletePlayer?.(player)}
                      disabled={deletingPlayerId === player.id}
                    >
                      {deletingPlayerId === player.id ? "Suppression..." : "Supprimer"}
                    </Button>
                  </Box>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
