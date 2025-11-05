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
  Alert,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";
import { BurnoutRule } from "@/types/team-management";

interface BurnoutRulesManagerProps {
  rules: BurnoutRule[];
  onSaveRule: (rule: BurnoutRule) => Promise<void>;
  onDeleteRule: (ruleId: string) => Promise<void>;
  onUpdateRule: (rule: BurnoutRule) => Promise<void>;
}

export function BurnoutRulesManager({
  rules,
  onSaveRule,
  onDeleteRule,
  onUpdateRule,
}: BurnoutRulesManagerProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<BurnoutRule | null>(null);
  const [saving, setSaving] = useState(false);

  const handleAddRule = () => {
    setEditingRule({
      id: "",
      name: "",
      description: "",
      type: "PLAYER_LIMIT",
      maxCount: 1,
      period: "SEASON",
      isActive: true,
    });
    setEditDialogOpen(true);
  };

  const handleEditRule = (rule: BurnoutRule) => {
    setEditingRule({ ...rule });
    setEditDialogOpen(true);
  };

  const handleSaveRule = async () => {
    if (!editingRule) return;

    try {
      setSaving(true);
      if (editingRule.id) {
        await onUpdateRule(editingRule);
      } else {
        await onSaveRule(editingRule);
      }
      setEditDialogOpen(false);
      setEditingRule(null);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette règle ?")) {
      try {
        await onDeleteRule(ruleId);
      } catch (error) {
        console.error("Erreur lors de la suppression:", error);
      }
    }
  };

  const handleCancel = () => {
    setEditDialogOpen(false);
    setEditingRule(null);
  };

  const getRuleTypeLabel = (type: string) => {
    switch (type) {
      case "PLAYER_LIMIT":
        return "Limite de joueur";
      case "TEAM_LIMIT":
        return "Limite d&apos;équipe";
      case "FOREIGN_LIMIT":
        return "Limite de joueurs étrangers";
      case "MUTATION_LIMIT":
        return "Limite de joueurs mutés";
      default:
        return type;
    }
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case "SEASON":
        return "Saison";
      case "MATCH_DAY":
        return "Journée";
      case "CUSTOM":
        return "Personnalisé";
      default:
        return period;
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
            <Typography variant="h6">
              Règles de brûlage personnalisées
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddRule}
            >
              Ajouter une règle
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Gérez les règles de brûlage personnalisées pour votre club.
          </Typography>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nom</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Limite</TableCell>
                  <TableCell>Période</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {rule.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {rule.description}
                      </Typography>
                    </TableCell>
                    <TableCell>{getRuleTypeLabel(rule.type)}</TableCell>
                    <TableCell>{rule.maxCount}</TableCell>
                    <TableCell>{getPeriodLabel(rule.period)}</TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Switch
                          checked={rule.isActive}
                          onChange={(e) =>
                            onUpdateRule({
                              ...rule,
                              isActive: e.target.checked,
                            })
                          }
                          size="small"
                        />
                        <Typography variant="caption">
                          {rule.isActive ? "Actif" : "Inactif"}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleEditRule(rule)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteRule(rule.id)}
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

          {rules.length === 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Aucune règle personnalisée définie. Les règles par défaut seront
              utilisées.
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
          {editingRule?.id ? "Modifier la règle" : "Nouvelle règle"}
        </DialogTitle>
        <DialogContent>
          {editingRule && (
            <Box sx={{ pt: 2 }}>
              <TextField
                fullWidth
                label="Nom de la règle"
                value={editingRule.name}
                onChange={(e) =>
                  setEditingRule({
                    ...editingRule,
                    name: e.target.value,
                  })
                }
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={editingRule.description}
                onChange={(e) =>
                  setEditingRule({
                    ...editingRule,
                    description: e.target.value,
                  })
                }
                sx={{ mb: 2 }}
              />
              <FormControl fullWidth sx={{ mb: 2 }}>
                <FormLabel>Type de règle</FormLabel>
                <Select
                  value={editingRule.type}
                  onChange={(e) =>
                    setEditingRule({
                      ...editingRule,
                      type: e.target.value as
                        | "team"
                        | "player"
                        | "match"
                        | "general",
                    })
                  }
                >
                  <MenuItem value="PLAYER_LIMIT">Limite de joueur</MenuItem>
                  <MenuItem value="TEAM_LIMIT">Limite d&apos;équipe</MenuItem>
                  <MenuItem value="FOREIGN_LIMIT">
                    Limite de joueurs étrangers
                  </MenuItem>
                  <MenuItem value="MUTATION_LIMIT">
                    Limite de joueurs mutés
                  </MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Limite maximale"
                type="number"
                value={editingRule.maxCount}
                onChange={(e) =>
                  setEditingRule({
                    ...editingRule,
                    maxCount: parseInt(e.target.value) || 1,
                  })
                }
                sx={{ mb: 2 }}
              />
              <FormControl fullWidth sx={{ mb: 2 }}>
                <FormLabel>Période d&apos;application</FormLabel>
                <Select
                  value={editingRule.period}
                  onChange={(e) =>
                    setEditingRule({
                      ...editingRule,
                      period: e.target.value as
                        | "match"
                        | "day"
                        | "week"
                        | "month"
                        | "season",
                    })
                  }
                >
                  <MenuItem value="SEASON">Saison</MenuItem>
                  <MenuItem value="MATCH_DAY">Journée</MenuItem>
                  <MenuItem value="CUSTOM">Personnalisé</MenuItem>
                </Select>
              </FormControl>
              <FormControlLabel
                control={
                  <Switch
                    checked={editingRule.isActive}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        isActive: e.target.checked,
                      })
                    }
                  />
                }
                label="Règle active"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} startIcon={<CancelIcon />}>
            Annuler
          </Button>
          <Button
            onClick={handleSaveRule}
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
