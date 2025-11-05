"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  FormLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Alert,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Sports as SportsIcon,
} from "@mui/icons-material";
import { Team } from "@/types/team-management";

interface TeamManagerProps {
  teams: Team[];
  onSaveTeam: (team: Team) => Promise<void>;
  onDeleteTeam: (teamId: string) => Promise<void>;
  onUpdateTeam: (team: Team) => Promise<void>;
}

export function TeamManager({
  teams,
  onSaveTeam,
  onDeleteTeam,
  onUpdateTeam,
}: TeamManagerProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [saving, setSaving] = useState(false);

  const handleAddTeam = () => {
    setEditingTeam({
      id: "",
      name: "",
      division: "",
      gender: "M",
      level: 1,
      isActive: true,
    });
    setEditDialogOpen(true);
  };

  const handleEditTeam = (team: Team) => {
    setEditingTeam({ ...team });
    setEditDialogOpen(true);
  };

  const handleSaveTeam = async () => {
    if (!editingTeam) return;

    try {
      setSaving(true);
      if (editingTeam.id) {
        await onUpdateTeam(editingTeam);
      } else {
        await onSaveTeam(editingTeam);
      }
      setEditDialogOpen(false);
      setEditingTeam(null);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette équipe ?")) {
      try {
        await onDeleteTeam(teamId);
      } catch (error) {
        console.error("Erreur lors de la suppression:", error);
      }
    }
  };

  const handleCancel = () => {
    setEditDialogOpen(false);
    setEditingTeam(null);
  };

  const getGenderLabel = (gender: "M" | "F") => {
    return gender === "M" ? "Masculin" : "Féminin";
  };

  const getGenderColor = (gender: "M" | "F") => {
    return gender === "M" ? "primary" : "secondary";
  };

  const getLevelLabel = (level: number) => {
    return `Équipe ${level}`;
  };

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
            <Typography variant="h6">Gestion des équipes</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddTeam}
            >
              Ajouter une équipe
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Gérez les équipes du club et leurs divisions.
          </Typography>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nom</TableCell>
                  <TableCell>Division</TableCell>
                  <TableCell>Genre</TableCell>
                  <TableCell>Niveau</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {teams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <SportsIcon color="action" />
                        <Typography variant="body2" fontWeight="medium">
                          {team.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={team.division}
                        variant="outlined"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getGenderLabel(team.gender)}
                        color={getGenderColor(team.gender)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{getLevelLabel(team.level)}</TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Switch
                          checked={team.isActive}
                          onChange={(e) =>
                            onUpdateTeam({
                              ...team,
                              isActive: e.target.checked,
                            })
                          }
                          size="small"
                        />
                        <Typography variant="caption">
                          {team.isActive ? "Actif" : "Inactif"}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleEditTeam(team)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteTeam(team.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {teams.length === 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Aucune équipe définie. Ajoutez votre première équipe pour
              commencer.
            </Alert>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={editDialogOpen}
        onClose={handleCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingTeam?.id ? "Modifier l&apos;équipe" : "Nouvelle équipe"}
        </DialogTitle>
        <DialogContent>
          {editingTeam && (
            <Box sx={{ pt: 2 }}>
              <TextField
                fullWidth
                label="Nom de l&apos;équipe"
                value={editingTeam.name}
                onChange={(e) =>
                  setEditingTeam({
                    ...editingTeam,
                    name: e.target.value,
                  })
                }
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Division"
                value={editingTeam.division}
                onChange={(e) =>
                  setEditingTeam({
                    ...editingTeam,
                    division: e.target.value,
                  })
                }
                sx={{ mb: 2 }}
              />
              <FormControl fullWidth sx={{ mb: 2 }}>
                <FormLabel>Genre</FormLabel>
                <Select
                  value={editingTeam.gender}
                  onChange={(e) =>
                    setEditingTeam({
                      ...editingTeam,
                      gender: e.target.value as "M" | "F",
                    })
                  }
                >
                  <MenuItem value="M">Masculin</MenuItem>
                  <MenuItem value="F">Féminin</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Niveau (1 = équipe 1, 2 = équipe 2, etc.)"
                type="number"
                value={editingTeam.level}
                onChange={(e) =>
                  setEditingTeam({
                    ...editingTeam,
                    level: parseInt(e.target.value) || 1,
                  })
                }
                sx={{ mb: 2 }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={editingTeam.isActive}
                    onChange={(e) =>
                      setEditingTeam({
                        ...editingTeam,
                        isActive: e.target.checked,
                      })
                    }
                  />
                }
                label="Équipe active"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} startIcon={<CancelIcon />}>
            Annuler
          </Button>
          <Button
            onClick={handleSaveTeam}
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

