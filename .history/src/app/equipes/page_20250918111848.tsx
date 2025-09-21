"use client";

import React from "react";
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
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import {
  ExpandMore,
  SportsTennis,
  Home,
  FlightTakeoff,
  Close,
  Info,
} from "@mui/icons-material";
import { useEquipesWithMatches } from "@/hooks/useEquipesWithMatches";

export default function EquipesPage() {
  const { equipes, loading, error } = useEquipesWithMatches();
  const [tabValue, setTabValue] = React.useState(0);

  // Grouper les équipes par épreuve en utilisant le vrai libellé de l'API
  const equipesByEpreuve = equipes.reduce((acc, equipe) => {
    if (equipe.matches.length > 0) {
      // Utiliser le libellé d'épreuve réel de l'API FFTT
      const epreuve =
        equipe.matches[0].epreuve ||
        (equipe.matches[0].division?.includes("Féminin") ||
        equipe.matches[0].division?.includes("Dames")
          ? "Championnat de France par Équipes Féminin"
          : "Championnat de France par Équipes Masculin");

      if (!acc[epreuve]) {
        acc[epreuve] = [];
      }
      acc[epreuve].push(equipe);
    }
    return acc;
  }, {} as Record<string, typeof equipes>);

  const epreuves = Object.keys(equipesByEpreuve);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const formatDate = (date: string | Date) => {
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(date));
  };

  const formatTime = (date: string | Date) => {
    const dateObj = new Date(date);
    // Ne pas afficher l'heure si elle est à minuit (pas d'heure disponible)
    if (dateObj.getHours() === 0 && dateObj.getMinutes() === 0) {
      return "";
    }
    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(dateObj);
  };

  const getMatchStatusChip = (match: Match) => {
    // Utiliser le résultat déterminé par l'API plutôt que la date
    if (match.result === "EXEMPT") {
      return <Chip label="EXEMPT" color="info" size="small" />;
    }
    if (match.result === "W.O.") {
      return <Chip label="W.O." color="error" size="small" />;
    }
    if (match.result === "VICTOIRE") {
      return <Chip label="VICTOIRE" color="success" size="small" />;
    }
    if (match.result === "DEFAITE") {
      return <Chip label="DÉFAITE" color="error" size="small" />;
    }
    if (match.result === "NUL") {
      return <Chip label="NUL" color="warning" size="small" />;
    }
    if (match.result === "À VENIR") {
      return <Chip label="À VENIR" color="warning" size="small" />;
    }

    // Fallback sur l'ancienne logique si pas de résultat
    return <Chip label="À VENIR" color="warning" size="small" />;
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
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
        <Alert severity="error">
          Erreur lors du chargement des données : {error}
        </Alert>
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

      {equipes.length === 0 ? (
        <Alert severity="info">Aucune équipe trouvée.</Alert>
      ) : (
        <Box sx={{ mt: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
            {epreuves.map((epreuve, index) => (
              <Tab
                key={epreuve}
                label={`${epreuve} (${equipesByEpreuve[epreuve].length})`}
                icon={<SportsTennis />}
                sx={{
                  color: epreuve.includes("Féminin")
                    ? "secondary.main"
                    : "primary.main",
                  "&.Mui-selected": {
                    color: epreuve.includes("Féminin")
                      ? "secondary.main"
                      : "primary.main",
                  },
                }}
              />
            ))}
          </Tabs>

          {/* Contenu des onglets */}
          {epreuves.map(
            (epreuve, index) =>
              tabValue === index && (
                <Box key={epreuve}>
                  {equipesByEpreuve[epreuve].length === 0 ? (
                    <Alert severity="info">
                      Aucune équipe trouvée pour cette épreuve.
                    </Alert>
                  ) : (
                    equipesByEpreuve[epreuve]
                      .sort((a, b) => {
                        const numA = parseInt(
                          a.team.name.match(/SQY PING (\d+)/)?.[1] || "0"
                        );
                        const numB = parseInt(
                          b.team.name.match(/SQY PING (\d+)/)?.[1] || "0"
                        );
                        return numA - numB;
                      })
                      .map((equipeWithMatches) => (
                        <Accordion
                          key={equipeWithMatches.team.id}
                          sx={{
                            mb: 2,
                            borderLeft: `4px solid ${
                              epreuve.includes("Féminin")
                                ? "#f57c00"
                                : "#1976d2"
                            }`,
                          }}
                        >
                          <AccordionSummary expandIcon={<ExpandMore />}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                width: "100%",
                              }}
                            >
                              <SportsTennis
                                sx={{
                                  mr: 2,
                                  color: epreuve.includes("Féminin")
                                    ? "secondary.main"
                                    : "primary.main",
                                }}
                              />
                              <Box sx={{ flexGrow: 1 }}>
                                <Typography variant="h6">
                                  {equipeWithMatches.team.name}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  {equipeWithMatches.team.division}
                                </Typography>
                              </Box>
                              <Chip
                                label={`${equipeWithMatches.matches.length} matchs`}
                                color={
                                  epreuve.includes("Féminin")
                                    ? "secondary"
                                    : "primary"
                                }
                                size="small"
                                sx={{ mr: 2 }}
                              />
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Box sx={{ mt: 2 }}>
                              {equipeWithMatches.matches.length === 0 ? (
                                <Alert severity="info">
                                  Aucun match trouvé pour cette équipe.
                                </Alert>
                              ) : (
                                <Grid container spacing={2}>
                                  {equipeWithMatches.matches
                                    .sort(
                                      (a, b) =>
                                        new Date(a.date).getTime() -
                                        new Date(b.date).getTime()
                                    )
                                    .map((match, index) => (
                                      <Grid
                                        item
                                        xs={12}
                                        md={6}
                                        key={`${match.ffttId}_${index}`}
                                      >
                                        <Card
                                          variant="outlined"
                                          sx={{ height: "100%" }}
                                        >
                                          <CardContent>
                                            <Box
                                              sx={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "flex-start",
                                                mb: 2,
                                              }}
                                            >
                                              <Typography
                                                variant="h6"
                                                component="div"
                                              >
                                                Journée {match.journee}
                                              </Typography>
                                              {getMatchStatusChip(match)}
                                            </Box>

                                            <Box
                                              sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                mb: 2,
                                              }}
                                            >
                                              {match.isHome ? (
                                                <Home
                                                  sx={{
                                                    mr: 1,
                                                    color: "primary.main",
                                                  }}
                                                />
                                              ) : (
                                                <FlightTakeoff
                                                  sx={{
                                                    mr: 1,
                                                    color: "secondary.main",
                                                  }}
                                                />
                                              )}
                                              <Typography
                                                variant="body1"
                                                sx={{ fontWeight: "bold" }}
                                              >
                                                {match.isHome
                                                  ? "À domicile"
                                                  : "À l'extérieur"}
                                              </Typography>
                                            </Box>

                                            <Typography
                                              variant="body1"
                                              sx={{ mb: 1 }}
                                            >
                                              <strong>Adversaire:</strong>{" "}
                                              {match.opponent}
                                            </Typography>
                                            <Typography
                                              variant="body2"
                                              color="text.secondary"
                                              sx={{ mb: 1 }}
                                            >
                                              <strong>Date:</strong>{" "}
                                              {formatDate(match.date)}
                                            </Typography>
                                            {formatTime(match.date) && (
                                              <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{ mb: 1 }}
                                              >
                                                <strong>Heure:</strong>{" "}
                                                {formatTime(match.date)}
                                              </Typography>
                                            )}
                                            <Typography
                                              variant="body2"
                                              color="text.secondary"
                                              sx={{ mb: 1 }}
                                            >
                                              <strong>Lieu:</strong>{" "}
                                              {match.location}
                                            </Typography>
                                            <Typography
                                              variant="body2"
                                              color="text.secondary"
                                              sx={{ mb: 1 }}
                                            >
                                              <strong>Phase:</strong>{" "}
                                              {match.phase}
                                            </Typography>
                                            {match.score && (
                                              <Typography
                                                variant="body1"
                                                sx={{
                                                  mb: 1,
                                                  fontWeight: "bold",
                                                  color:
                                                    match.result === "VICTOIRE"
                                                      ? "success.main"
                                                      : match.result ===
                                                        "DEFAITE"
                                                      ? "error.main"
                                                      : "text.primary",
                                                }}
                                              >
                                                <strong>Score:</strong>{" "}
                                                {match.score}
                                              </Typography>
                                            )}
                                            {match.rencontreId && (
                                              <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{ mb: 1 }}
                                              >
                                                <strong>ID Rencontre:</strong>{" "}
                                                {match.rencontreId}
                                              </Typography>
                                            )}
                                            {match.equipeIds && (
                                              <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{ mb: 1 }}
                                              >
                                                <strong>IDs Équipes:</strong>{" "}
                                                {match.equipeIds.equipe1} vs{" "}
                                                {match.equipeIds.equipe2}
                                              </Typography>
                                            )}
                                            {match.resultatsIndividuels && (
                                              <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{ mb: 1 }}
                                              >
                                                <strong>
                                                  Résultats individuels:
                                                </strong>{" "}
                                                {JSON.stringify(
                                                  match.resultatsIndividuels
                                                ).substring(0, 100)}
                                                ...
                                              </Typography>
                                            )}
                                          </CardContent>
                                        </Card>
                                      </Grid>
                                    ))}
                                </Grid>
                              )}
                            </Box>
                          </AccordionDetails>
                        </Accordion>
                      ))
                  )}
                </Box>
              )
          )}
        </Box>
      )}
    </Box>
  );
}
