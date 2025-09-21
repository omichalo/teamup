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
import { Layout } from "@/components/Layout";
import { AuthGuard } from "@/components/AuthGuard";

export default function EquipesPage() {
  const { equipes, loading, error } = useEquipesWithMatches();
  const [tabValue, setTabValue] = React.useState(0);
  const [selectedMatch, setSelectedMatch] = React.useState<Match | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);

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

  const handleMatchClick = (match: Match) => {
    if (match.resultatsIndividuels) {
      setSelectedMatch(match);
      setModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedMatch(null);
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
      <AuthGuard>
        <Layout>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "50vh",
            }}
          >
            <CircularProgress />
            <Typography variant="h6" sx={{ ml: 2 }}>
              Chargement des équipes et matchs...
            </Typography>
          </Box>
        </Layout>
      </AuthGuard>
    );
  }

  if (error) {
    return (
      <AuthGuard>
        <Layout>
          <Box sx={{ p: 3 }}>
            <Alert severity="error">
              Erreur lors du chargement des données : {error}
            </Alert>
          </Box>
        </Layout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Layout>
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
                                              sx={{
                                                height: "100%",
                                                cursor:
                                                  match.resultatsIndividuels
                                                    ? "pointer"
                                                    : "default",
                                                transition:
                                                  "all 0.2s ease-in-out",
                                                "&:hover":
                                                  match.resultatsIndividuels
                                                    ? {
                                                        boxShadow: 3,
                                                        transform:
                                                          "translateY(-2px)",
                                                      }
                                                    : {},
                                              }}
                                              onClick={() =>
                                                handleMatchClick(match)
                                              }
                                            >
                                              <CardContent>
                                                <Box
                                                  sx={{
                                                    display: "flex",
                                                    justifyContent:
                                                      "space-between",
                                                    alignItems: "flex-start",
                                                    mb: 2,
                                                  }}
                                                >
                                                  <Box
                                                    sx={{
                                                      display: "flex",
                                                      alignItems: "center",
                                                    }}
                                                  >
                                                    <Typography
                                                      variant="h6"
                                                      component="div"
                                                    >
                                                      Journée {match.journee}
                                                    </Typography>
                                                    {match.resultatsIndividuels && (
                                                      <Info
                                                        sx={{
                                                          ml: 1,
                                                          color: "primary.main",
                                                          fontSize: 20,
                                                        }}
                                                      />
                                                    )}
                                                  </Box>
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
                                                        match.result ===
                                                        "VICTOIRE"
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
                                                    <strong>
                                                      ID Rencontre:
                                                    </strong>{" "}
                                                    {match.rencontreId}
                                                  </Typography>
                                                )}
                                                {match.equipeIds && (
                                                  <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                    sx={{ mb: 1 }}
                                                  >
                                                    <strong>
                                                      IDs Équipes:
                                                    </strong>{" "}
                                                    {match.equipeIds.equipe1} vs{" "}
                                                    {match.equipeIds.equipe2}
                                                  </Typography>
                                                )}
                                                {match.resultatsIndividuels && (
                                                  <Typography
                                                    variant="body2"
                                                    color="primary.main"
                                                    sx={{
                                                      mb: 1,
                                                      fontStyle: "italic",
                                                      fontWeight: "bold",
                                                    }}
                                                  >
                                                    💡 Cliquez pour voir les
                                                    détails du match
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

          {/* Modal pour afficher les détails du match */}
          <Dialog
            open={modalOpen}
            onClose={handleCloseModal}
            maxWidth="md"
            fullWidth
            PaperProps={{
              sx: {
                borderRadius: 2,
                maxHeight: "90vh",
              },
            }}
          >
            <DialogTitle>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography variant="h5" component="div">
                  Détails du match
                </Typography>
                <Button
                  onClick={handleCloseModal}
                  sx={{ minWidth: "auto", p: 1 }}
                >
                  <Close />
                </Button>
              </Box>
            </DialogTitle>

            <DialogContent dividers>
              {selectedMatch && (
                <Box>
                  {/* Informations générales */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Informations générales
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Journée:</strong> {selectedMatch.journee}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Phase:</strong> {selectedMatch.phase}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Date:</strong>{" "}
                          {formatDate(selectedMatch.date)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Lieu:</strong> {selectedMatch.location}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Adversaire:</strong> {selectedMatch.opponent}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>

                  {/* Résultat */}
                  {selectedMatch.score && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h6" gutterBottom>
                        Résultat
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Box
                        sx={{
                          p: 2,
                          bgcolor:
                            selectedMatch.result === "VICTOIRE"
                              ? "success.light"
                              : selectedMatch.result === "DEFAITE"
                              ? "error.light"
                              : "grey.100",
                          borderRadius: 1,
                          textAlign: "center",
                        }}
                      >
                        <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                          {selectedMatch.score}
                        </Typography>
                        <Typography variant="h6" sx={{ mt: 1 }}>
                          {selectedMatch.result}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {/* Compositions des équipes */}
                  {selectedMatch.resultatsIndividuels && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h6" gutterBottom>
                        Compositions des équipes
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Grid container spacing={3}>
                        {/* Équipe A */}
                        <Grid item xs={12} md={6}>
                          <Box
                            sx={{
                              p: 2,
                              bgcolor: "primary.light",
                              borderRadius: 1,
                            }}
                          >
                            <Typography
                              variant="h6"
                              sx={{ mb: 2, color: "primary.contrastText" }}
                            >
                              {selectedMatch.resultatsIndividuels.nomEquipeA ||
                                "Équipe A"}
                            </Typography>
                            {selectedMatch.resultatsIndividuels.joueursA &&
                              Object.entries(
                                selectedMatch.resultatsIndividuels.joueursA
                              ).map(([nomComplet, joueur]) => (
                                <Box
                                  key={nomComplet}
                                  sx={{
                                    mb: 1,
                                    p: 1,
                                    bgcolor: "white",
                                    borderRadius: 1,
                                  }}
                                >
                                  <Typography
                                    variant="body1"
                                    sx={{ fontWeight: "bold" }}
                                  >
                                    {joueur.prenom} {joueur.nom}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    Licence: {joueur.licence} • Points:{" "}
                                    {joueur.points}
                                  </Typography>
                                </Box>
                              ))}
                          </Box>
                        </Grid>

                        {/* Équipe B */}
                        <Grid item xs={12} md={6}>
                          <Box
                            sx={{
                              p: 2,
                              bgcolor: "secondary.light",
                              borderRadius: 1,
                            }}
                          >
                            <Typography
                              variant="h6"
                              sx={{ mb: 2, color: "secondary.contrastText" }}
                            >
                              {selectedMatch.resultatsIndividuels.nomEquipeB ||
                                "Équipe B"}
                            </Typography>
                            {selectedMatch.resultatsIndividuels.joueursB &&
                              Object.entries(
                                selectedMatch.resultatsIndividuels.joueursB
                              ).map(([nomComplet, joueur]) => (
                                <Box
                                  key={nomComplet}
                                  sx={{
                                    mb: 1,
                                    p: 1,
                                    bgcolor: "white",
                                    borderRadius: 1,
                                  }}
                                >
                                  <Typography
                                    variant="body1"
                                    sx={{ fontWeight: "bold" }}
                                  >
                                    {joueur.prenom} {joueur.nom}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    Licence: {joueur.licence} • Points:{" "}
                                    {joueur.points}
                                  </Typography>
                                </Box>
                              ))}
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>
                  )}

                  {/* Résultats des parties individuelles */}
                  {selectedMatch.resultatsIndividuels && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h6" gutterBottom>
                        Résultats des parties
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      {selectedMatch.resultatsIndividuels.parties &&
                        selectedMatch.resultatsIndividuels.parties.map(
                          (partie, index) => (
                            <Box
                              key={index}
                              sx={{
                                mb: 2,
                                p: 2,
                                border: 1,
                                borderColor: "grey.300",
                                borderRadius: 1,
                              }}
                            >
                              <Typography
                                variant="h6"
                                sx={{ mb: 2, textAlign: "center" }}
                              >
                                Partie {index + 1}
                              </Typography>
                              <Grid container spacing={2} alignItems="center">
                                <Grid item xs={5}>
                                  <Typography
                                    variant="body1"
                                    sx={{
                                      fontWeight: "bold",
                                      textAlign: "right",
                                    }}
                                  >
                                    {partie.adversaireA}
                                  </Typography>
                                </Grid>
                                <Grid item xs={2}>
                                  <Typography
                                    variant="h5"
                                    sx={{
                                      textAlign: "center",
                                      fontWeight: "bold",
                                    }}
                                  >
                                    {partie.scoreA} - {partie.scoreB}
                                  </Typography>
                                </Grid>
                                <Grid item xs={5}>
                                  <Typography
                                    variant="body1"
                                    sx={{ fontWeight: "bold" }}
                                  >
                                    {partie.adversaireB}
                                  </Typography>
                                </Grid>
                              </Grid>
                              {partie.setDetails &&
                                partie.setDetails.length > 0 && (
                                  <Box sx={{ mt: 2, textAlign: "center" }}>
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                    >
                                      Sets: {partie.setDetails.join(" - ")}
                                    </Typography>
                                  </Box>
                                )}
                            </Box>
                          )
                        )}
                      {!selectedMatch.resultatsIndividuels.parties && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ textAlign: "center", py: 2 }}
                        >
                          Aucun détail de partie disponible
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              )}
            </DialogContent>

            <DialogActions>
              <Button onClick={handleCloseModal} variant="contained">
                Fermer
              </Button>
            </DialogActions>
          </Dialog>

          {/* Section Conditions de Brûlage */}
          <Box sx={{ mt: 4 }}>
            <Typography variant="h4" gutterBottom>
              Conditions de Brûlage
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Vérification des conditions de brûlage pour les joueurs des équipes SQY Ping.
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Test avec Données Simulées
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Test des conditions de brûlage avec des données simulées pour vérifier le fonctionnement.
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={() => {
                        window.open('/api/test-burnout', '_blank');
                      }}
                      sx={{ mb: 2 }}
                    >
                      Tester les Conditions de Brûlage
                    </Button>
                    <Typography variant="body2" color="text.secondary">
                      Cliquez sur le bouton pour ouvrir le test dans un nouvel onglet et voir les résultats.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Conditions Actuelles
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Maximum de matchs par joueur:</strong> 7
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Maximum de matchs consécutifs:</strong> 3
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Minimum de jours entre les matchs:</strong> 1
                      </Typography>
                    </Box>
                    <Alert severity="info" sx={{ mt: 2 }}>
                      Les conditions de brûlage sont calculées automatiquement pour chaque joueur 
                      en fonction de sa participation aux matchs de l'équipe.
                    </Alert>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </Layout>
    </AuthGuard>
  );
}
