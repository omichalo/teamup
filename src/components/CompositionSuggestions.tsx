"use client";

import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  ExpandMore as ExpandMoreIcon,
  AutoAwesome as AutoAwesomeIcon,
} from "@mui/icons-material";
import { Player } from "@/types/team-management";

interface CompositionSuggestionsProps {
  suggestions: {
    suggested: string[];
    alternatives: string[][];
    reasons: string[];
  };
  players: Player[];
  currentComposition: string[];
  onAddPlayer: (playerId: string) => void;
  onRemovePlayer: (playerId: string) => void;
  onApplySuggestion: (playerIds: string[]) => void;
}

export function CompositionSuggestions({
  suggestions,
  players,
  currentComposition,
  onAddPlayer,
  onRemovePlayer,
  onApplySuggestion,
}: CompositionSuggestionsProps) {
  const getPlayerName = (playerId: string) => {
    const player = players.find((p) => p.id === playerId);
    return player ? `${player.firstName} ${player.name}` : "Joueur inconnu";
  };

  const isPlayerInComposition = (playerId: string) => {
    return currentComposition.includes(playerId);
  };

  const handleApplySuggestion = (playerIds: string[]) => {
    onApplySuggestion(playerIds);
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <AutoAwesomeIcon color="primary" />
          <Typography variant="h6">Suggestions de composition</Typography>
        </Box>

        {suggestions.reasons.length > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              {suggestions.reasons.join(", ")}
            </Typography>
          </Alert>
        )}

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>
              Suggestion principale ({suggestions.suggested.length} joueurs)
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List dense>
              {suggestions.suggested.map((playerId) => (
                <ListItem key={playerId}>
                  <ListItemText
                    primary={getPlayerName(playerId)}
                    secondary={
                      isPlayerInComposition(playerId)
                        ? "Déjà dans la composition"
                        : "Disponible"
                    }
                  />
                  <ListItemSecondaryAction>
                    {isPlayerInComposition(playerId) ? (
                      <IconButton
                        edge="end"
                        onClick={() => onRemovePlayer(playerId)}
                        color="error"
                      >
                        <RemoveIcon />
                      </IconButton>
                    ) : (
                      <IconButton
                        edge="end"
                        onClick={() => onAddPlayer(playerId)}
                        color="primary"
                      >
                        <AddIcon />
                      </IconButton>
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
            <Box mt={2}>
              <Button
                variant="contained"
                onClick={() => handleApplySuggestion(suggestions.suggested)}
                startIcon={<AutoAwesomeIcon />}
                fullWidth
              >
                Appliquer cette suggestion
              </Button>
            </Box>
          </AccordionDetails>
        </Accordion>

        {suggestions.alternatives.length > 0 && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>
                Alternatives ({suggestions.alternatives.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {suggestions.alternatives.map((alternative, index) => (
                <Box key={index} mb={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Alternative {index + 1} ({alternative.length} joueurs)
                  </Typography>
                  <List dense>
                    {alternative.map((playerId) => (
                      <ListItem key={playerId}>
                        <ListItemText
                          primary={getPlayerName(playerId)}
                          secondary={
                            isPlayerInComposition(playerId)
                              ? "Déjà dans la composition"
                              : "Disponible"
                          }
                        />
                        <ListItemSecondaryAction>
                          {isPlayerInComposition(playerId) ? (
                            <IconButton
                              edge="end"
                              onClick={() => onRemovePlayer(playerId)}
                              color="error"
                            >
                              <RemoveIcon />
                            </IconButton>
                          ) : (
                            <IconButton
                              edge="end"
                              onClick={() => onAddPlayer(playerId)}
                              color="primary"
                            >
                              <AddIcon />
                            </IconButton>
                          )}
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                  <Button
                    variant="outlined"
                    onClick={() => handleApplySuggestion(alternative)}
                    size="small"
                    fullWidth
                  >
                    Appliquer cette alternative
                  </Button>
                </Box>
              ))}
            </AccordionDetails>
          </Accordion>
        )}

        {suggestions.suggested.length === 0 &&
          suggestions.alternatives.length === 0 && (
            <Alert severity="warning">
              Aucune suggestion disponible. Vérifiez les disponibilités des
              joueurs.
            </Alert>
          )}
      </CardContent>
    </Card>
  );
}
