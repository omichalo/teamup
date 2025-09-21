"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Grid,
  Paper,
  Divider,
} from "@mui/material";
import { ExpandMore, SportsTennis, Home, Away } from "@mui/icons-material";
import { Match, Team } from "@/types";

interface EquipeWithMatches {
  team: Team;
  matches: Match[];
}

export default function EquipesPage() {
  const [equipesWithMatches, setEquipesWithMatches] = useState<EquipeWithMatches[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEquipesWithMatches = async () => {
      try {
        setLoading(true);
        setError(null);

        // Récupérer les données depuis l'API
        const response = await fetch("/api/fftt/real-matches?clubCode=08781477");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const matches: Match[] = await response.json();

        // Grouper les matchs par équipe
        const equipesMap = new Map<number, EquipeWithMatches>();

        matches.forEach((match) => {
          const teamNumber = match.teamNumber;
          
          if (!equipesMap.has(teamNumber)) {
            equipesMap.set(teamNumber, {
              team: {
                id: `team_${teamNumber}`,
                name: `SQY PING ${teamNumber}`,
                division: "Division inconnue",
                players: [],
                coach: "",
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              matches: [],
            });
          }

          equipesMap.get(teamNumber)!.matches.push(match);
        });

        // Convertir en array et trier par numéro d'équipe
        const equipesArray = Array.from(equipesMap.values()).sort(
          (a, b) => a.team.name.localeCompare(b.team.name)
        );

        setEquipesWithMatches(equipesArray);
      } catch (error) {
        console.error("Error fetching equipes with matches:", error);
        setError(error instanceof Error ? error.message : "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchEquipesWithMatches();
  }, []);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getMatchStatusChip = (match: Match) => {
    if (match.isExempt) {
      return <Chip label="EXEMPT" color="info" size="small" />;
    }
    if (match.isForfeit) {
      return <Chip label="W.O." color="error" size="small" />;
    }
    if (match.date < new Date()) {
      return <Chip label="TERMINÉ" color="success" size="small" />;
    }
    return <Chip label="À VENIR" color="warning" size="small" />;
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Chargement des équipes et matchs...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Erreur lors du chargement des données : {error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Équipes SQY Ping
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Consultez les matchs de chaque équipe
      </Typography>

      {equipesWithMatches.length === 0 ? (
        <Alert severity="info">Aucune équipe trouvée.</Alert>
      ) : (
        <Box sx={{ mt: 3 }}>
          {equipesWithMatches.map((equipeWithMatches) => (
            <Accordion key={equipeWithMatches.team.id} sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
                  <SportsTennis sx={{ mr: 2, color: "primary.main" }} />
                  <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    {equipeWithMatches.team.name}
                  </Typography>
                  <Chip
                    label={`${equipeWithMatches.matches.length} matchs`}
                    color="primary"
                    size="small"
                    sx={{ mr: 2 }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ mt: 2 }}>
                  {equipeWithMatches.matches.length === 0 ? (
                    <Alert severity="info">Aucun match trouvé pour cette équipe.</Alert>
                  ) : (
                    <Grid container spacing={2}>
                      {equipeWithMatches.matches
                        .sort((a, b) => a.date.getTime() - b.date.getTime())
                        .map((match, index) => (
                          <Grid item xs={12} md={6} key={`${match.ffttId}_${index}`}>
                            <Card variant="outlined" sx={{ height: "100%" }}>
                              <CardContent>
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                                  <Typography variant="h6" component="div">
                                    Journée {match.journee}
                                  </Typography>
                                  {getMatchStatusChip(match)}
                                </Box>

                                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                                  {match.isHome ? (
                                    <Home sx={{ mr: 1, color: "primary.main" }} />
                                  ) : (
                                    <Away sx={{ mr: 1, color: "secondary.main" }} />
                                  )}
                                  <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                                    {match.isHome ? "À domicile" : "À l'extérieur"}
                                  </Typography>
                                </Box>

                                <Typography variant="body1" sx={{ mb: 1 }}>
                                  <strong>Adversaire:</strong> {match.opponent}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                  <strong>Club:</strong> {match.opponentClub}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                  <strong>Date:</strong> {formatDate(match.date)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                  <strong>Heure:</strong> {formatTime(match.date)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                  <strong>Lieu:</strong> {match.location}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  <strong>Phase:</strong> {match.phase}
                                </Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                    </Grid>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
    </Box>
  );
}
