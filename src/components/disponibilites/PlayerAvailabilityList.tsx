"use client";

import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Accessible as AccessibleIcon,
  Cancel,
  CheckCircle,
  LinkOff as LinkOffIcon,
} from "@mui/icons-material";
import { Player } from "@/types/team-management";
import { ChampionshipType } from "@/types";
import { AvailabilityResponse } from "@/lib/services/availability-service";
import { EpreuveType } from "@/lib/shared/epreuve-utils";
import { AvailabilityStatusChip } from "@/components/disponibilites/AvailabilityStatusChip";

function isPlayerRegistered(
  player: Player,
  selectedEpreuve: EpreuveType | null | undefined
): boolean {
  if (!selectedEpreuve) return false;
  if (selectedEpreuve === "championnat_paris") {
    return player.participation?.championnatParis === true;
  }
  return player.participation?.championnat === true;
}

interface PlayerAvailabilityListProps {
  players: Player[];
  availabilities: Record<
    string,
    {
      masculin?: AvailabilityResponse;
      feminin?: AvailabilityResponse;
    }
  >;
  onAvailabilityChange: (
    playerId: string,
    championshipType: ChampionshipType,
    available: boolean
  ) => void;
  onCommentChange: (
    playerId: string,
    championshipType: ChampionshipType,
    comment: string
  ) => void;
  selectedEpreuve?: EpreuveType | null;
}

export function PlayerAvailabilityList({
  players,
  availabilities,
  onAvailabilityChange,
  onCommentChange,
  selectedEpreuve,
}: PlayerAvailabilityListProps) {
  const isParisChampionship = selectedEpreuve === "championnat_paris";
  const [expandedPlayer, setExpandedPlayer] = useState<{
    id: string;
    type: ChampionshipType;
  } | null>(null);

  return (
    <Box>
      {players.map((player) => {
        const playerAvailabilities = availabilities[player.id] || {};
        const masculinAvailability = playerAvailabilities.masculin;
        const femininAvailability = playerAvailabilities.feminin;
        const isFemale = player.gender === "F";

        const hasRespondedMasculin =
          typeof masculinAvailability?.available === "boolean";
        const hasRespondedFeminin =
          typeof femininAvailability?.available === "boolean";

        let hasResponded: boolean;
        if (isParisChampionship) {
          hasResponded = hasRespondedMasculin;
        } else {
          if (isFemale) {
            hasResponded = hasRespondedMasculin && hasRespondedFeminin;
          } else {
            hasResponded = hasRespondedMasculin;
          }
        }

        const isExpanded = expandedPlayer?.id === player.id;

        return (
          <Card
            key={player.id}
            sx={{
              mb: 1,
              borderLeft: hasResponded
                ? `4px solid ${
                    masculinAvailability?.available ? "#4caf50" : "#f44336"
                  }`
                : "4px solid transparent",
            }}
          >
            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Box display="flex" alignItems="flex-start" gap={2}>
                <Box
                  display="flex"
                  alignItems="center"
                  gap={1}
                  flexGrow={1}
                  minWidth={0}
                  sx={{
                    flexDirection: { xs: "column", sm: "row" },
                    alignItems: { xs: "flex-start", sm: "center" },
                  }}
                >
                  <Typography
                    variant="body1"
                    fontWeight="medium"
                    sx={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {player.firstName} {player.name}
                  </Typography>
                  {player.isWheelchair && (
                    <Tooltip title="Joueur en fauteuil">
                      <AccessibleIcon
                        fontSize="small"
                        sx={{ color: "primary.main", ml: 0.5 }}
                      />
                    </Tooltip>
                  )}
                  {!isPlayerRegistered(player, selectedEpreuve) && (
                    <Tooltip title="Joueur non inscrit au championnat">
                      <Chip
                        label="Non inscrit"
                        size="small"
                        variant="outlined"
                        color="warning"
                        sx={{ height: 22, fontSize: "0.7rem", fontWeight: 600 }}
                      />
                    </Tooltip>
                  )}
                  {!player.discordMentions?.length && (
                    <Tooltip title="Non associé à un compte Discord">
                      <Chip
                        icon={<LinkOffIcon sx={{ fontSize: 14 }} />}
                        label="Sans Discord"
                        size="small"
                        variant="outlined"
                        color="default"
                        sx={{ height: 22, fontSize: "0.7rem" }}
                      />
                    </Tooltip>
                  )}
                  <Chip
                    label={player.gender === "M" ? "M" : "F"}
                    size="small"
                    color={player.gender === "M" ? "primary" : "secondary"}
                    sx={{ height: 20, fontSize: "0.7rem" }}
                  />
                  {player.license && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ whiteSpace: "nowrap" }}
                    >
                      {player.license}
                    </Typography>
                  )}
                  <Box
                    display="flex"
                    gap={1}
                    alignItems="center"
                    flexWrap="wrap"
                  >
                    {isParisChampionship ? (
                      <AvailabilityStatusChip
                        status={
                          masculinAvailability?.available === true
                            ? "available"
                            : masculinAvailability?.available === false
                              ? "unavailable"
                              : masculinAvailability?.comment
                                ? "pending"
                                : "unknown"
                        }
                      />
                    ) : (
                      <AvailabilityStatusChip
                        status={
                          masculinAvailability?.available === true
                            ? "available"
                            : masculinAvailability?.available === false
                              ? "unavailable"
                              : masculinAvailability?.comment
                                ? "pending"
                                : "unknown"
                        }
                        label="Masculin"
                      />
                    )}
                    {isFemale && !isParisChampionship && (
                      <>
                        <AvailabilityStatusChip
                          status={
                            femininAvailability?.available === true
                              ? "available"
                              : femininAvailability?.available === false
                                ? "unavailable"
                                : femininAvailability?.comment
                                  ? "pending"
                                  : "unknown"
                          }
                          label="Féminin"
                        />
                        {typeof femininAvailability?.fridayAvailable ===
                          "boolean" && (
                          <AvailabilityStatusChip
                            status={
                              femininAvailability.fridayAvailable === true
                                ? "available"
                                : "unavailable"
                            }
                            label="Vendredi"
                          />
                        )}
                        {typeof femininAvailability?.saturdayAvailable ===
                          "boolean" && (
                          <AvailabilityStatusChip
                            status={
                              femininAvailability.saturdayAvailable === true
                                ? "available"
                                : "unavailable"
                            }
                            label="Samedi"
                          />
                        )}
                      </>
                    )}
                  </Box>
                </Box>

                <Box
                  display="flex"
                  flexDirection="column"
                  gap={1}
                  sx={{ minWidth: { xs: "100%", sm: 280 } }}
                >
                  {isParisChampionship ? (
                    <Box
                      display="flex"
                      alignItems="center"
                      gap={1}
                      sx={{ flexWrap: "wrap" }}
                    >
                      <Button
                        variant={
                          masculinAvailability?.available === true
                            ? "contained"
                            : "outlined"
                        }
                        color="success"
                        size="small"
                        onClick={() =>
                          onAvailabilityChange(player.id, "masculin", true)
                        }
                        sx={{ minWidth: 70, flexGrow: { xs: 1, sm: 0 } }}
                      >
                        <CheckCircle fontSize="small" sx={{ mr: 0.5 }} />
                        Oui
                      </Button>
                      <Button
                        variant={
                          masculinAvailability?.available === false
                            ? "contained"
                            : "outlined"
                        }
                        color="error"
                        size="small"
                        onClick={() =>
                          onAvailabilityChange(player.id, "masculin", false)
                        }
                        sx={{ minWidth: 70, flexGrow: { xs: 1, sm: 0 } }}
                      >
                        <Cancel fontSize="small" sx={{ mr: 0.5 }} />
                        Non
                      </Button>
                      <Button
                        size="small"
                        onClick={() =>
                          setExpandedPlayer(
                            isExpanded && expandedPlayer?.type === "masculin"
                              ? null
                              : { id: player.id, type: "masculin" }
                          )
                        }
                        sx={{
                          minWidth: 40,
                          position: masculinAvailability?.comment
                            ? "relative"
                            : undefined,
                          ...(masculinAvailability?.comment
                            ? {
                                "&::after": {
                                  content: "''",
                                  position: "absolute",
                                  top: 4,
                                  right: 6,
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  bgcolor: "info.main",
                                },
                              }
                            : {}),
                        }}
                      >
                        💬
                      </Button>
                    </Box>
                  ) : (
                    <>
                      <Box
                        display="flex"
                        alignItems="center"
                        gap={1}
                        sx={{ flexWrap: "wrap" }}
                      >
                        <Typography
                          variant="caption"
                          sx={{ minWidth: 80, fontWeight: "medium" }}
                        >
                          Masculin:
                        </Typography>
                        <Button
                          variant={
                            masculinAvailability?.available === true
                              ? "contained"
                              : "outlined"
                          }
                          color="success"
                          size="small"
                          onClick={() =>
                            onAvailabilityChange(player.id, "masculin", true)
                          }
                          sx={{ minWidth: 70, flexGrow: { xs: 1, sm: 0 } }}
                        >
                          <CheckCircle fontSize="small" sx={{ mr: 0.5 }} />
                          Oui
                        </Button>
                        <Button
                          variant={
                            masculinAvailability?.available === false
                              ? "contained"
                              : "outlined"
                          }
                          color="error"
                          size="small"
                          onClick={() =>
                            onAvailabilityChange(player.id, "masculin", false)
                          }
                          sx={{ minWidth: 70, flexGrow: { xs: 1, sm: 0 } }}
                        >
                          <Cancel fontSize="small" sx={{ mr: 0.5 }} />
                          Non
                        </Button>
                        <Button
                          size="small"
                          onClick={() =>
                            setExpandedPlayer(
                              isExpanded && expandedPlayer?.type === "masculin"
                                ? null
                                : { id: player.id, type: "masculin" }
                            )
                          }
                          sx={{
                            minWidth: 40,
                            position: masculinAvailability?.comment
                              ? "relative"
                              : undefined,
                            ...(masculinAvailability?.comment
                              ? {
                                  "&::after": {
                                    content: "''",
                                    position: "absolute",
                                    top: 4,
                                    right: 6,
                                    width: 6,
                                    height: 6,
                                    borderRadius: "50%",
                                    bgcolor: "info.main",
                                  },
                                }
                              : {}),
                          }}
                        >
                          💬
                        </Button>
                      </Box>

                      {isFemale && (
                        <Box
                          display="flex"
                          alignItems="center"
                          gap={1}
                          sx={{ flexWrap: "wrap" }}
                        >
                          <Typography
                            variant="caption"
                            sx={{ minWidth: 80, fontWeight: "medium" }}
                          >
                            Féminin:
                          </Typography>
                          <Button
                            variant={
                              femininAvailability?.available === true
                                ? "contained"
                                : "outlined"
                            }
                            color="success"
                            size="small"
                            onClick={() =>
                              onAvailabilityChange(player.id, "feminin", true)
                            }
                            sx={{ minWidth: 70, flexGrow: { xs: 1, sm: 0 } }}
                          >
                            <CheckCircle fontSize="small" sx={{ mr: 0.5 }} />
                            Oui
                          </Button>
                          <Button
                            variant={
                              femininAvailability?.available === false
                                ? "contained"
                                : "outlined"
                            }
                            color="error"
                            size="small"
                            onClick={() =>
                              onAvailabilityChange(player.id, "feminin", false)
                            }
                            sx={{ minWidth: 70, flexGrow: { xs: 1, sm: 0 } }}
                          >
                            <Cancel fontSize="small" sx={{ mr: 0.5 }} />
                            Non
                          </Button>
                          <Button
                            size="small"
                            onClick={() =>
                              setExpandedPlayer(
                                isExpanded && expandedPlayer?.type === "feminin"
                                  ? null
                                  : { id: player.id, type: "feminin" }
                              )
                            }
                            sx={{
                              minWidth: 40,
                              position: femininAvailability?.comment
                                ? "relative"
                                : undefined,
                              ...(femininAvailability?.comment
                                ? {
                                    "&::after": {
                                      content: "''",
                                      position: "absolute",
                                      top: 4,
                                      right: 6,
                                      width: 6,
                                      height: 6,
                                      borderRadius: "50%",
                                      bgcolor: "info.main",
                                    },
                                  }
                                : {}),
                            }}
                          >
                            💬
                          </Button>
                        </Box>
                      )}
                    </>
                  )}
                </Box>
              </Box>

              {isExpanded && (
                <Box
                  sx={{
                    mt: 2,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  {isParisChampionship ? (
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Commentaire (optionnel)"
                      id={`comment-${player.id}-masculin`}
                      name={`comment-${player.id}-masculin`}
                      value={masculinAvailability?.comment || ""}
                      onChange={(e) =>
                        onCommentChange(player.id, "masculin", e.target.value)
                      }
                      multiline
                      rows={2}
                    />
                  ) : (
                    <>
                      <Box>
                        <Typography
                          id={`comment-label-${player.id}-masculin`}
                          variant="caption"
                          sx={{ mb: 0.5, display: "block" }}
                        >
                          Commentaire Masculin:
                        </Typography>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder="Commentaire (optionnel)"
                          id={`comment-${player.id}-masculin`}
                          name={`comment-${player.id}-masculin`}
                          value={masculinAvailability?.comment || ""}
                          onChange={(e) =>
                            onCommentChange(player.id, "masculin", e.target.value)
                          }
                          multiline
                          rows={2}
                          inputProps={{
                            "aria-labelledby": `comment-label-${player.id}-masculin`,
                          }}
                        />
                      </Box>

                      {isFemale && (
                        <Box>
                          <Typography
                            id={`comment-label-${player.id}-feminin`}
                            variant="caption"
                            sx={{ mb: 0.5, display: "block" }}
                          >
                            Commentaire Féminin:
                          </Typography>
                          <TextField
                            fullWidth
                            size="small"
                            placeholder="Commentaire (optionnel)"
                            id={`comment-${player.id}-feminin`}
                            name={`comment-${player.id}-feminin`}
                            value={femininAvailability?.comment || ""}
                            onChange={(e) =>
                              onCommentChange(player.id, "feminin", e.target.value)
                            }
                            multiline
                            rows={2}
                            inputProps={{
                              "aria-labelledby": `comment-label-${player.id}-feminin`,
                            }}
                          />
                        </Box>
                      )}
                    </>
                  )}
                </Box>
              )}

              {(masculinAvailability?.comment ||
                (isFemale &&
                  !isParisChampionship &&
                  femininAvailability?.comment)) &&
                !isExpanded && (
                  <Box
                    sx={{
                      mt: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 0.5,
                    }}
                  >
                    {isParisChampionship ? (
                      masculinAvailability?.comment && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontStyle: "italic" }}
                        >
                          {masculinAvailability.comment}
                        </Typography>
                      )
                    ) : (
                      <>
                        {masculinAvailability?.comment && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontStyle: "italic" }}
                          >
                            <strong>Masc:</strong> {masculinAvailability.comment}
                          </Typography>
                        )}
                        {isFemale && femininAvailability?.comment && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontStyle: "italic" }}
                          >
                            <strong>Fém:</strong> {femininAvailability.comment}
                          </Typography>
                        )}
                      </>
                    )}
                  </Box>
                )}
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}
