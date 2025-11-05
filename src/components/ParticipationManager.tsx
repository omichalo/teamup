"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
} from "@mui/material";
import { Player, Team } from "@/types/team-management";

interface ParticipationManagerProps {
  player: Player;
  teams: Team[];
  onUpdateParticipation: (
    playerId: string,
    teamId: string,
    isParticipating: boolean
  ) => Promise<void>;
}

export function ParticipationManager({
  player,
  teams,
  onUpdateParticipation,
}: ParticipationManagerProps) {
  const [updating, setUpdating] = useState<string | null>(null);

  const handleParticipationChange = async (
    teamId: string,
    isParticipating: boolean
  ) => {
    try {
      setUpdating(teamId);
      await onUpdateParticipation(player.id, teamId, isParticipating);
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
    } finally {
      setUpdating(null);
    }
  };

  const getTeamGender = (team: Team) => {
    return team.gender === "M" ? "Masculin" : "Féminin";
  };

  const getTeamColor = (team: Team) => {
    return team.gender === "M" ? "primary" : "secondary";
  };

  const participatingTeams = teams.filter(
    (team) => player.participation[team.id]
  );

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Participations aux championnats - {player.firstName} {player.name}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Gérez les participations de ce joueur aux différentes équipes du club.
        </Typography>

        <Box mb={3}>
          <Typography variant="subtitle1" gutterBottom>
            Équipes participantes ({participatingTeams.length})
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {participatingTeams.map((team) => (
              <Chip
                key={team.id}
                label={`${team.name} (${getTeamGender(team)})`}
                color={getTeamColor(team)}
                size="small"
              />
            ))}
            {participatingTeams.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Aucune participation
              </Typography>
            )}
          </Box>
        </Box>

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Équipe</TableCell>
                <TableCell>Division</TableCell>
                <TableCell>Genre</TableCell>
                <TableCell align="center">Participation</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {teams.map((team) => (
                <TableRow key={team.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {team.name}
                    </Typography>
                  </TableCell>
                  <TableCell>{team.division}</TableCell>
                  <TableCell>
                    <Chip
                      label={getTeamGender(team)}
                      color={getTeamColor(team)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <FormControlLabel
                      control={
                        <Switch
                          checked={player.participation[team.id] || false}
                          onChange={(e) =>
                            handleParticipationChange(team.id, e.target.checked)
                          }
                          disabled={updating === team.id}
                          size="small"
                        />
                      }
                      label=""
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Alert severity="info" sx={{ mt: 2 }}>
          Les participations déterminent quelles équipes peuvent être composées
          avec ce joueur.
        </Alert>
      </CardContent>
    </Card>
  );
}
