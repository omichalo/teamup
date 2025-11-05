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
  Home as HomeIcon,
  FlightTakeoff as AwayIcon,
} from "@mui/icons-material";
import { MatchHistory, Player, Team } from "@/types/team-management";

interface MatchHistoryManagerProps {
  matchHistory: MatchHistory[];
  players: Player[];
  teams: Team[];
  onSaveMatch: (match: MatchHistory) => Promise<void>;
  onDeleteMatch: (matchId: string) => Promise<void>;
  onUpdateMatch: (match: MatchHistory) => Promise<void>;
}

export function MatchHistoryManager({
  matchHistory,
  players,
  teams,
  onSaveMatch,
  onDeleteMatch,
  onUpdateMatch,
}: MatchHistoryManagerProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<MatchHistory | null>(null);
  const [saving, setSaving] = useState(false);

  const handleAddMatch = () => {
    setEditingMatch({
      id: "",
      playerId: "",
      teamId: "",
      date: new Date().toISOString().split("T")[0],
      opponent: "",
      result: "WIN",
      isHome: true,
    });
    setEditDialogOpen(true);
  };

  const handleEditMatch = (match: MatchHistory) => {
    setEditingMatch({ ...match });
    setEditDialogOpen(true);
  };

  const handleSaveMatch = async () => {
    if (!editingMatch) return;

    try {
      setSaving(true);
      if (editingMatch.id) {
        await onUpdateMatch(editingMatch);
      } else {
        await onSaveMatch(editingMatch);
      }
      setEditDialogOpen(false);
      setEditingMatch(null);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce match ?")) {
      try {
        await onDeleteMatch(matchId);
      } catch (error) {
        console.error("Erreur lors de la suppression:", error);
      }
    }
  };

  const handleCancel = () => {
    setEditDialogOpen(false);
    setEditingMatch(null);
  };

  const getPlayerName = (playerId: string) => {
    const player = players.find((p) => p.id === playerId);
    return player ? `${player.firstName} ${player.name}` : "Joueur inconnu";
  };

  const getTeamName = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    return team ? team.name : "Équipe inconnue";
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case "WIN":
        return "success";
      case "LOSS":
        return "error";
      case "DRAW":
        return "warning";
      default:
        return "default";
    }
  };

  const getResultLabel = (result: string) => {
    switch (result) {
      case "WIN":
        return "Victoire";
      case "LOSS":
        return "Défaite";
      case "DRAW":
        return "Match nul";
      default:
        return result;
    }
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
            <Typography variant="h6">Historique des matchs</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddMatch}
            >
              Ajouter un match
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Gérez l&apos;historique des matchs pour le calcul du brûlage.
          </Typography>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Joueur</TableCell>
                  <TableCell>Équipe</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Adversaire</TableCell>
                  <TableCell>Résultat</TableCell>
                  <TableCell>Domicile</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {matchHistory.map((match) => (
                  <TableRow key={match.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {getPlayerName(match.playerId)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getTeamName(match.teamId)}
                        variant="outlined"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(match.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{match.opponent}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getResultLabel(match.result)}
                        color={getResultColor(match.result)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {match.isHome ? (
                          <HomeIcon color="primary" />
                        ) : (
                          <AwayIcon color="secondary" />
                        )}
                        <Typography variant="caption">
                          {match.isHome ? "Domicile" : "Extérieur"}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleEditMatch(match)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteMatch(match.id)}
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

          {matchHistory.length === 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Aucun match enregistré. Ajoutez des matchs pour commencer le
              suivi.
            </Alert>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={editDialogOpen}
        onClose={handleCancel}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingMatch?.id ? "Modifier le match" : "Nouveau match"}
        </DialogTitle>
        <DialogContent>
          {editingMatch && (
            <Box sx={{ pt: 2 }}>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                  <FormControl fullWidth>
                    <FormLabel>Joueur</FormLabel>
                    <Select
                      value={editingMatch.playerId}
                      onChange={(e) =>
                        setEditingMatch({
                          ...editingMatch,
                          playerId: e.target.value,
                        })
                      }
                    >
                      {players.map((player) => (
                        <MenuItem key={player.id} value={player.id}>
                          {player.firstName} {player.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                  <FormControl fullWidth>
                    <FormLabel>Équipe</FormLabel>
                    <Select
                      value={editingMatch.teamId}
                      onChange={(e) =>
                        setEditingMatch({
                          ...editingMatch,
                          teamId: e.target.value,
                        })
                      }
                    >
                      {teams.map((team) => (
                        <MenuItem key={team.id} value={team.id}>
                          {team.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                  <TextField
                    fullWidth
                    label="Date"
                    type="date"
                    value={editingMatch.date}
                    onChange={(e) =>
                      setEditingMatch({
                        ...editingMatch,
                        date: e.target.value,
                      })
                    }
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
                <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                  <TextField
                    fullWidth
                    label="Adversaire"
                    value={editingMatch.opponent}
                    onChange={(e) =>
                      setEditingMatch({
                        ...editingMatch,
                        opponent: e.target.value,
                      })
                    }
                  />
                </Box>
                <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                  <FormControl fullWidth>
                    <FormLabel>Résultat</FormLabel>
                    <Select
                      value={editingMatch.result}
                      onChange={(e) =>
                        setEditingMatch({
                          ...editingMatch,
                          result: e.target.value as "WIN" | "LOSS" | "DRAW",
                        })
                      }
                    >
                      <MenuItem value="WIN">Victoire</MenuItem>
                      <MenuItem value="LOSS">Défaite</MenuItem>
                      <MenuItem value="DRAW">Match nul</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ width: { xs: "100%", sm: "50%" } }}>
                  <FormControl fullWidth>
                    <FormLabel>Lieu</FormLabel>
                    <Select
                      value={editingMatch.isHome ? "home" : "away"}
                      onChange={(e) =>
                        setEditingMatch({
                          ...editingMatch,
                          isHome: e.target.value === "home",
                        })
                      }
                    >
                      <MenuItem value="home">Domicile</MenuItem>
                      <MenuItem value="away">Extérieur</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} startIcon={<CancelIcon />}>
            Annuler
          </Button>
          <Button
            onClick={handleSaveMatch}
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
