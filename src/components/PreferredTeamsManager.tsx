"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Alert,
} from "@mui/material";
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";
import { Player, Team } from "@/types/team-management";

interface PreferredTeamsManagerProps {
  player: Player;
  teams: Team[];
  onSave: (
    playerId: string,
    preferredTeams: { masculine: string[]; feminine: string[] }
  ) => Promise<void>;
}

export function PreferredTeamsManager({
  player,
  teams,
  onSave,
}: PreferredTeamsManagerProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedMasculine, setSelectedMasculine] = useState<string[]>([]);
  const [selectedFeminine, setSelectedFeminine] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelectedMasculine(player.preferredTeams.masculine);
    setSelectedFeminine(player.preferredTeams.feminine);
  }, [player]);

  const handleEdit = () => {
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave(player.id, {
        masculine: selectedMasculine,
        feminine: selectedFeminine,
      });
      setEditDialogOpen(false);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedMasculine(player.preferredTeams.masculine);
    setSelectedFeminine(player.preferredTeams.feminine);
    setEditDialogOpen(false);
  };

  const handleMasculineChange = (teamId: string, checked: boolean) => {
    if (checked) {
      setSelectedMasculine([...selectedMasculine, teamId]);
    } else {
      setSelectedMasculine(selectedMasculine.filter((id) => id !== teamId));
    }
  };

  const handleFeminineChange = (teamId: string, checked: boolean) => {
    if (checked) {
      setSelectedFeminine([...selectedFeminine, teamId]);
    } else {
      setSelectedFeminine(selectedFeminine.filter((id) => id !== teamId));
    }
  };

  const masculineTeams = teams.filter((team) => team.gender === "M");
  const feminineTeams = teams.filter((team) => team.gender === "F");

  return (
    <>
      <Card>
        <CardContent>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Typography variant="h6">
              Équipes préférées - {player.firstName} {player.name}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={handleEdit}
              size="small"
            >
              Modifier
            </Button>
          </Box>

          <Box mb={2}>
            <Typography variant="subtitle2" gutterBottom>
              Championnat masculin
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {player.preferredTeams.masculine.map((teamId) => {
                const team = teams.find((t) => t.id === teamId);
                return (
                  <Chip
                    key={teamId}
                    label={team?.name || "Équipe inconnue"}
                    color="primary"
                    size="small"
                  />
                );
              })}
              {player.preferredTeams.masculine.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Aucune équipe préférée
                </Typography>
              )}
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Championnat féminin
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {player.preferredTeams.feminine.map((teamId) => {
                const team = teams.find((t) => t.id === teamId);
                return (
                  <Chip
                    key={teamId}
                    label={team?.name || "Équipe inconnue"}
                    color="secondary"
                    size="small"
                  />
                );
              })}
              {player.preferredTeams.feminine.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Aucune équipe préférée
                </Typography>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Dialog
        open={editDialogOpen}
        onClose={handleCancel}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Modifier les équipes préférées - {player.firstName} {player.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Championnat masculin
            </Typography>
            <FormGroup>
              {masculineTeams.map((team) => (
                <FormControlLabel
                  key={team.id}
                  control={
                    <Checkbox
                      checked={selectedMasculine.includes(team.id)}
                      onChange={(e) =>
                        handleMasculineChange(team.id, e.target.checked)
                      }
                    />
                  }
                  label={`${team.name} - ${team.division}`}
                />
              ))}
            </FormGroup>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Championnat féminin
            </Typography>
            <FormGroup>
              {feminineTeams.map((team) => (
                <FormControlLabel
                  key={team.id}
                  control={
                    <Checkbox
                      checked={selectedFeminine.includes(team.id)}
                      onChange={(e) =>
                        handleFeminineChange(team.id, e.target.checked)
                      }
                    />
                  }
                  label={`${team.name} - ${team.division}`}
                />
              ))}
            </FormGroup>

            <Alert severity="info" sx={{ mt: 2 }}>
              Les équipes préférées sont utilisées pour les suggestions
              automatiques de composition.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} startIcon={<CancelIcon />}>
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={saving}
          >
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
