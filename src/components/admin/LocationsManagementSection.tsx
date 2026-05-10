"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Paper,
} from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";

export function LocationsManagementSection() {
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newLocationName, setNewLocationName] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/locations", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const result = await response.json();

      if (response.ok && result.success) {
        setLocations(result.locations || []);
      } else {
        setError(result.error || "Erreur lors de la récupération des lieux");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLocations();
  }, [fetchLocations]);

  const handleAddLocation = useCallback(async () => {
    if (!newLocationName.trim()) {
      setError("Le nom du lieu est requis");
      return;
    }

    setAdding(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/locations", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newLocationName.trim() }),
      });
      const result = await response.json();

      if (response.ok && result.success) {
        setNewLocationName("");
        setSuccess("Lieu ajouté avec succès");
        await fetchLocations();
      } else {
        setError(result.error || "Erreur lors de l'ajout du lieu");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erreur réseau");
    } finally {
      setAdding(false);
    }
  }, [newLocationName, fetchLocations]);

  const handleDeleteLocation = useCallback(
    async (locationId: string) => {
      if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce lieu ?")) {
        return;
      }

      setDeleting(locationId);
      setError(null);
      setSuccess(null);

      try {
        const response = await fetch(`/api/admin/locations?id=${locationId}`, {
          method: "DELETE",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });
        const result = await response.json();

        if (response.ok && result.success) {
          setSuccess("Lieu supprimé avec succès");
          await fetchLocations();
        } else {
          setError(result.error || "Erreur lors de la suppression du lieu");
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : "Erreur réseau");
      } finally {
        setDeleting(null);
      }
    },
    [fetchLocations]
  );

  return (
    <Box>
      {error ? (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert
          severity="success"
          sx={{ mb: 3 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      ) : null}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Typography variant="h6">Ajouter un lieu</Typography>
          </Box>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              label="Nom du lieu"
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !adding) {
                  void handleAddLocation();
                }
              }}
              fullWidth
              size="small"
            />
            <Button
              variant="contained"
              onClick={() => void handleAddLocation()}
              disabled={adding || !newLocationName.trim()}
              startIcon={adding ? <CircularProgress size={20} /> : <AddIcon />}
            >
              {adding ? "Ajout..." : "Ajouter"}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Typography variant="h6">Liste des lieux</Typography>
          </Box>
          {loading ? (
            <Box display="flex" alignItems="center" gap={2}>
              <CircularProgress size={24} />
              <Typography variant="body2">Chargement des lieux…</Typography>
            </Box>
          ) : locations.length === 0 ? (
            <Alert severity="info">
              Aucun lieu défini. Ajoutez votre premier lieu pour commencer.
            </Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: "action.hover" }}>
                    <TableCell sx={{ fontWeight: 700 }}>Nom</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 120 }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {locations.map((location) => (
                    <TableRow
                      key={location.id}
                      sx={{
                        "&:hover": {
                          backgroundColor: "action.hover",
                        },
                      }}
                    >
                      <TableCell>{location.name}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() => void handleDeleteLocation(location.id)}
                          disabled={deleting === location.id}
                        >
                          {deleting === location.id ? "Suppression..." : "Supprimer"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
