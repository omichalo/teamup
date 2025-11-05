"use client";

import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from "@mui/icons-material";

interface CompositionConflictsProps {
  conflicts: {
    hasConflicts: boolean;
    conflicts: {
      playerId: string;
      conflictingTeam: string;
      message: string;
    }[];
  };
  players: Array<{ id: string; firstName: string; name: string }>;
  teams: Array<{ id: string; name: string }>;
  onResolveConflict?: (playerId: string, conflictingTeam: string) => void;
}

export function CompositionConflicts({
  conflicts,
  players,
  teams,
  onResolveConflict,
}: CompositionConflictsProps) {
  const [resolveDialogOpen, setResolveDialogOpen] = React.useState(false);
  const [selectedConflict, setSelectedConflict] = React.useState<{
    playerId: string;
    conflictingTeam: string;
    message: string;
  } | null>(null);

  const getPlayerName = (playerId: string) => {
    const player = players.find((p) => p.id === playerId);
    return player ? `${player.firstName} ${player.name}` : "Joueur inconnu";
  };

  const getTeamName = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    return team ? team.name : "Équipe inconnue";
  };

  const handleResolveConflict = (conflict: {
    playerId: string;
    conflictingTeam: string;
    message: string;
  }) => {
    setSelectedConflict(conflict);
    setResolveDialogOpen(true);
  };

  const handleConfirmResolve = () => {
    if (selectedConflict && onResolveConflict) {
      onResolveConflict(
        selectedConflict.playerId,
        selectedConflict.conflictingTeam
      );
    }
    setResolveDialogOpen(false);
    setSelectedConflict(null);
  };

  if (!conflicts.hasConflicts) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1}>
            <InfoIcon color="success" />
            <Typography variant="h6" color="success.main">
              Aucun conflit détecté
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Tous les joueurs sélectionnés sont disponibles pour cette date.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <WarningIcon color="warning" />
            <Typography variant="h6" color="warning.main">
              Conflits détectés ({conflicts.conflicts.length})
            </Typography>
          </Box>

          <Alert severity="warning" sx={{ mb: 2 }}>
            Certains joueurs sont déjà sélectionnés dans d&apos;autres équipes pour
            cette date.
          </Alert>

          <List>
            {conflicts.conflicts.map((conflict, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  <ErrorIcon color="error" />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body1">
                        {getPlayerName(conflict.playerId)}
                      </Typography>
                      <Chip
                        label={getTeamName(conflict.conflictingTeam)}
                        color="error"
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  }
                  secondary={conflict.message}
                />
                {onResolveConflict && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleResolveConflict(conflict)}
                  >
                    Résoudre
                  </Button>
                )}
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      <Dialog
        open={resolveDialogOpen}
        onClose={() => setResolveDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Résoudre le conflit</DialogTitle>
        <DialogContent>
          {selectedConflict && (
            <Box>
              <Typography variant="body1" gutterBottom>
                Voulez-vous retirer {getPlayerName(selectedConflict.playerId)}{" "}
                de l&apos;équipe {getTeamName(selectedConflict.conflictingTeam)} ?
              </Typography>
              <Alert severity="warning" sx={{ mt: 2 }}>
                Cette action modifiera la composition de l&apos;équipe{" "}
                {getTeamName(selectedConflict.conflictingTeam)}.
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResolveDialogOpen(false)}>Annuler</Button>
          <Button
            onClick={handleConfirmResolve}
            variant="contained"
            color="error"
          >
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
