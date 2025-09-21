"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useFirestorePlayers } from "@/hooks/useFirestorePlayers";
import { useFirestoreTeams } from "@/hooks/useFirestoreTeams";
import { useJournees } from "@/hooks/useJournees";
import { Player, Team, Match, CompositionValidation } from "@/types";
import { useRouter } from "next/navigation";

interface CompositionSlot {
  playerId?: string;
  player?: Player;
}

interface TeamComposition {
  A?: CompositionSlot;
  B?: CompositionSlot;
  C?: CompositionSlot;
  D?: CompositionSlot;
}

export default function CompositionsPage() {
  const { user, isCoach } = useAuth();
  const router = useRouter();
  const {
    players,
    loading: playersLoading,
    error: playersError,
  } = useFirestorePlayers(100);
  const {
    teams,
    loading: teamsLoading,
    error: teamsError,
  } = useFirestoreTeams(20);
  const {
    journees,
    loading: journeesLoading,
    error: journeesError,
  } = useJournees();
  const [selectedJournee, setSelectedJournee] = useState<number | null>(null);
  const [selectedTeam, setSelectedTeam] = useState(1);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [teamCompositions, setTeamCompositions] = useState<{
    [teamNumber: number]: TeamComposition;
  }>({});
  const [validation, setValidation] = useState<CompositionValidation | null>(
    null
  );
  const [showValidationDialog, setShowValidationDialog] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push("/auth");
      return;
    }

    if (!isCoach) {
      router.push("/");
      return;
    }
  }, [user, isCoach, router]);

  // Initialiser les données quand les joueurs et équipes sont chargés
  useEffect(() => {
    if (
      !playersLoading &&
      !teamsLoading &&
      players.length > 0 &&
      teams.length > 0
    ) {
      setAvailablePlayers(players);

      // Initialiser les compositions vides
      const initialCompositions: { [teamNumber: number]: TeamComposition } = {};
      teams.forEach((team) => {
        initialCompositions[team.number] = {};
      });
      setTeamCompositions(initialCompositions);
    }
  }, [playersLoading, teamsLoading, players, teams]);

  const handleDragEnd = (result: {
    destination: any;
    source: any;
    draggableId: string;
  }) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const player = players.find((p) => p.id === draggableId);
    if (!player) return;

    // Si on déplace depuis la liste des disponibles vers une position d'équipe
    if (source.droppableId === "available-players") {
      const teamNumber = parseInt(destination.droppableId.split("-")[1]);
      const position = destination.droppableId.split("-")[2] as
        | "A"
        | "B"
        | "C"
        | "D";

      setTeamCompositions((prev) => ({
        ...prev,
        [teamNumber]: {
          ...prev[teamNumber],
          [position]: { playerId: player.id, player },
        },
      }));

      // Retirer le joueur de la liste des disponibles
      setAvailablePlayers((prev) => prev.filter((p) => p.id !== player.id));
    }
    // Si on déplace d'une position d'équipe vers une autre
    else if (destination.droppableId.startsWith("team-")) {
      const sourceTeamNumber = parseInt(source.droppableId.split("-")[1]);
      const sourcePosition = source.droppableId.split("-")[2] as
        | "A"
        | "B"
        | "C"
        | "D";
      const destTeamNumber = parseInt(destination.droppableId.split("-")[1]);
      const destPosition = destination.droppableId.split("-")[2] as
        | "A"
        | "B"
        | "C"
        | "D";

      setTeamCompositions((prev) => {
        const newCompositions = { ...prev };

        // Retirer de la position source
        delete newCompositions[sourceTeamNumber][sourcePosition];

        // Ajouter à la position destination
        newCompositions[destTeamNumber] = {
          ...newCompositions[destTeamNumber],
          [destPosition]: { playerId: player.id, player },
        };

        return newCompositions;
      });
    }
    // Si on remet dans la liste des disponibles
    else if (destination.droppableId === "available-players") {
      const teamNumber = parseInt(source.droppableId.split("-")[1]);
      const position = source.droppableId.split("-")[2] as
        | "A"
        | "B"
        | "C"
        | "D";

      setTeamCompositions((prev) => ({
        ...prev,
        [teamNumber]: {
          ...prev[teamNumber],
          [position]: undefined,
        },
      }));

      // Remettre le joueur dans la liste des disponibles
      setAvailablePlayers((prev) =>
        [...prev, player].sort((a, b) => b.points - a.points)
      );
    }
  };

  const validateComposition = async () => {
    try {
      const composition = teamCompositions[selectedTeam];
      const compositionData = {
        A: composition.A?.playerId,
        B: composition.B?.playerId,
        C: composition.C?.playerId,
        D: composition.D?.playerId,
      };

      // Simuler la validation
      const mockValidation: CompositionValidation = {
        isValid: true,
        errors: [],
      };

      setValidation(mockValidation);
      setShowValidationDialog(true);
    } catch (error) {
      console.error("Validation error:", error);
    }
  };

  const saveComposition = async () => {
    try {
      // Ici vous feriez l'appel API pour sauvegarder la composition
      console.log("Saving composition:", teamCompositions[selectedTeam]);
      setShowValidationDialog(false);
      // Afficher un message de succès
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  const sendDiscordNotification = async () => {
    try {
      // Ici vous feriez l'appel API pour envoyer la notification Discord
      console.log("Sending Discord notification");
    } catch (error) {
      console.error("Discord notification error:", error);
    }
  };

  const loading = playersLoading || teamsLoading;

  if (loading) {
    return (
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
            Chargement des données...
          </Typography>
        </Box>
      </Layout>
    );
  }

  if (playersError || teamsError) {
    return (
      <Layout>
        <Box sx={{ p: 3 }}>
          <Alert severity="error">
            Erreur lors du chargement des données: {playersError || teamsError}
          </Alert>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Compositions d&apos;équipes
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          {players.length} joueurs et {teams.length} équipes chargés depuis
          Firestore
        </Typography>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Journée</InputLabel>
              <Select
                value={selectedJournee}
                onChange={(e) => setSelectedJournee(Number(e.target.value))}
              >
                <MenuItem value={1}>Journée 1</MenuItem>
                <MenuItem value={2}>Journée 2</MenuItem>
                <MenuItem value={3}>Journée 3</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Équipe</InputLabel>
              <Select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(Number(e.target.value))}
              >
                {teams.map((team) => (
                  <MenuItem key={team.id} value={team.number}>
                    {team.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid xs={12} md={4}>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                variant="contained"
                onClick={validateComposition}
                disabled={!teamCompositions[selectedTeam]?.A}
              >
                Valider
              </Button>
              <Button
                variant="outlined"
                onClick={sendDiscordNotification}
                disabled={!teamCompositions[selectedTeam]?.A}
              >
                Envoyer Discord
              </Button>
            </Box>
          </Grid>
        </Grid>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Grid container spacing={3}>
            {/* Zones de composition pour chaque équipe */}
            {teams.map((team) => (
              <Grid xs={12} md={4} key={team.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {team.name}
                    </Typography>

                    <Grid container spacing={1}>
                      {(["A", "B", "C", "D"] as const).map((position) => (
                        <Grid xs={6} key={position}>
                          <Droppable
                            droppableId={`team-${team.number}-${position}`}
                          >
                            {(provided, snapshot) => (
                              <Box
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                sx={{
                                  minHeight: 60,
                                  border: "2px dashed",
                                  borderColor: snapshot.isDraggingOver
                                    ? "primary.main"
                                    : "grey.300",
                                  borderRadius: 1,
                                  p: 1,
                                  backgroundColor: snapshot.isDraggingOver
                                    ? "action.hover"
                                    : "transparent",
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  Position {position}
                                </Typography>

                                {teamCompositions[team.number]?.[position]
                                  ?.player && (
                                  <Draggable
                                    draggableId={
                                      teamCompositions[team.number][position]!
                                        .playerId!
                                    }
                                    index={0}
                                  >
                                    {(provided, snapshot) => (
                                      <Chip
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        label={`${
                                          teamCompositions[team.number][
                                            position
                                          ]!.player!.firstName
                                        } ${
                                          teamCompositions[team.number][
                                            position
                                          ]!.player!.lastName
                                        }`}
                                        color="primary"
                                        size="small"
                                        sx={{ mt: 1 }}
                                      />
                                    )}
                                  </Draggable>
                                )}

                                {provided.placeholder}
                              </Box>
                            )}
                          </Droppable>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Liste des joueurs disponibles */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Joueurs disponibles
              </Typography>

              <Droppable droppableId="available-players" direction="horizontal">
                {(provided, snapshot) => (
                  <Box
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 1,
                      minHeight: 60,
                      border: "2px dashed",
                      borderColor: snapshot.isDraggingOver
                        ? "secondary.main"
                        : "grey.300",
                      borderRadius: 1,
                      p: 2,
                      backgroundColor: snapshot.isDraggingOver
                        ? "action.hover"
                        : "transparent",
                    }}
                  >
                    {availablePlayers.map((player, index) => (
                      <Draggable
                        key={player.id}
                        draggableId={player.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <Chip
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            label={`${player.firstName} ${player.lastName} (${player.points} pts)`}
                            color={player.isFemale ? "secondary" : "default"}
                            variant={
                              snapshot.isDragging ? "filled" : "outlined"
                            }
                          />
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </Box>
                )}
              </Droppable>
            </CardContent>
          </Card>
        </DragDropContext>

        {/* Dialog de validation */}
        <Dialog
          open={showValidationDialog}
          onClose={() => setShowValidationDialog(false)}
        >
          <DialogTitle>Validation de la composition</DialogTitle>
          <DialogContent>
            {validation?.isValid ? (
              <Alert severity="success">
                La composition est valide ! Toutes les règles sont respectées.
              </Alert>
            ) : (
              <Box>
                <Alert severity="error" sx={{ mb: 2 }}>
                  La composition contient des erreurs :
                </Alert>
                {validation?.errors.map((error, index) => (
                  <Alert key={index} severity="warning" sx={{ mb: 1 }}>
                    {error.message}
                  </Alert>
                ))}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowValidationDialog(false)}>
              Fermer
            </Button>
            {validation?.isValid && (
              <Button onClick={saveComposition} variant="contained">
                Sauvegarder
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}
