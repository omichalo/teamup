"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  IconButton,
  Popover,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  useTheme,
  Tooltip,
} from "@mui/material";
import { EmojiEvents as LeaderboardIcon } from "@mui/icons-material";

export interface PoolRankingEntry {
  classement: number;
  nomEquipe: string;
  matchJouees: number;
  points: number;
  victoires: number;
  defaites: number;
  egalites: number;
  /** Points (ou sets) marqués */
  pf?: number;
  /** Points (ou sets) encaissés */
  pg?: number;
  /** Différence (pour - contre) */
  pp?: number;
}

interface PoolRankingPopoverProps {
  teamId: string;
  teamName: string;
  /** Phase sélectionnée (aller | retour) pour afficher le classement de la bonne poule */
  phase?: "aller" | "retour" | null;
  /** Nom de l'adversaire du match de la journée sélectionnée (pour mise en évidence) */
  opponentTeamName?: string | null;
}

/** Normalise le nom d'équipe (retire " - Phase 1/2" pour comparaison avec le classement FFTT). */
function normalizeTeamName(name: string): string {
  return name
    .replace(/\s*-\s*Phase\s*[12]\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/** Vérifie si le nom d'équipe du classement FFTT correspond à notre équipe (SQY PING). */
function isOurTeam(nomEquipe: string, teamName: string): boolean {
  const n = nomEquipe.toUpperCase().replace(/\s+/g, " ").trim();
  if (!n.includes("SQY PING")) return false;
  const t = normalizeTeamName(teamName);
  if (t.length === 0) return true;
  return n.includes(t) || t.includes(n);
}

/** Vérifie si le nom d'équipe du classement correspond à l'adversaire (match partiel). */
function isOpponentRow(nomEquipe: string, opponentTeamName: string | null | undefined): boolean {
  if (!opponentTeamName || !opponentTeamName.trim()) return false;
  const a = nomEquipe.toLowerCase();
  const b = opponentTeamName.toLowerCase().trim();
  return a.includes(b) || b.split(/\s+/).some((part) => part.length > 2 && a.includes(part));
}

export function PoolRankingPopover({
  teamId,
  teamName,
  phase,
  opponentTeamName,
}: PoolRankingPopoverProps) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [ranking, setRanking] = useState<PoolRankingEntry[] | null>(null);
  const [division, setDivision] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRanking = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ teamId });
      if (phase === "aller" || phase === "retour") {
        params.set("phase", phase);
      }
      const res = await fetch(
        `/api/fftt/pool-ranking?${params.toString()}`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Erreur ${res.status}`);
      }
      const data = await res.json();
      setRanking(data.ranking ?? []);
      setDivision(data.division ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger le classement");
      setRanking(null);
    } finally {
      setLoading(false);
    }
  }, [teamId, phase]);

  useEffect(() => {
    setRanking(null);
    setDivision(null);
    setError(null);
  }, [teamId, phase]);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    if (ranking === null && !loading) {
      void fetchRanking();
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  const rowHighlight = useMemo(
    () => ({
      ourTeam: {
        bgcolor: theme.palette.primary.main + "14",
        borderLeft: `3px solid ${theme.palette.primary.main}`,
        "& .MuiTableCell-root": { fontWeight: 600 },
      },
      opponent: {
        bgcolor: theme.palette.secondary.main + "12",
        borderLeft: `3px solid ${theme.palette.secondary.main}`,
        "& .MuiTableCell-root": { fontWeight: 500 },
      },
    }),
    [theme.palette.primary.main, theme.palette.secondary.main]
  );

  return (
    <>
      <IconButton
        size="small"
        onClick={handleOpen}
        aria-label="Voir le classement de la poule"
        color="default"
        sx={{ ml: 0.25 }}
      >
        <LeaderboardIcon fontSize="small" />
      </IconButton>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{
          elevation: 8,
          sx: {
            minWidth: 460,
            width: "max-content",
            maxWidth: "min(95vw, 580px)",
            maxHeight: "min(75vh, 620px)",
            borderRadius: 2,
            overflow: "hidden",
          },
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%", maxHeight: "min(75vh, 620px)" }}>
          <Box
            sx={{
              px: 2,
              py: 1.5,
              bgcolor: "primary.main",
              color: "primary.contrastText",
            }}
          >
            <Typography variant="subtitle1" fontWeight={600}>
              {teamName}
            </Typography>
            {division && (
              <Typography variant="caption" sx={{ opacity: 0.9, display: "block", mt: 0.25 }}>
                {division}
              </Typography>
            )}
          </Box>
          <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
            {loading && (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress size={32} />
              </Box>
            )}
            {error && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                {error}
              </Alert>
            )}
            {!loading && !error && ranking && ranking.length > 0 && (
              <>
                <Table size="small" stickyHeader sx={{ "& .MuiTableRow-root:hover": { bgcolor: "action.hover" } }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: "grey.100" }}>
                      <TableCell sx={{ fontWeight: 700, color: "grey.700", width: 48 }}>Rang</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: "grey.700" }}>Équipe</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: "grey.700", width: 44 }}>Pts</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, color: "grey.700", width: 36 }}>J</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, color: "grey.700", width: 52 }}>V/N/D</TableCell>
                      {(ranking[0]?.pf !== undefined || ranking[0]?.pg !== undefined) && (
                        <>
                          <Tooltip title="Points (ou sets) marqués / encaissés">
                            <TableCell align="center" sx={{ fontWeight: 700, color: "grey.700", width: 64 }}>
                              Pour/Contre
                            </TableCell>
                          </Tooltip>
                          {ranking[0]?.pp !== undefined && (
                            <Tooltip title="Différence (pour − contre)">
                              <TableCell align="center" sx={{ fontWeight: 700, color: "grey.700", width: 44 }}>
                                Diff
                              </TableCell>
                            </Tooltip>
                          )}
                        </>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ranking.map((row, index) => {
                      const ourTeam = isOurTeam(row.nomEquipe, teamName);
                      const opponent = isOpponentRow(row.nomEquipe, opponentTeamName);
                      const showPourContre = ranking[0]?.pf !== undefined || ranking[0]?.pg !== undefined;
                      const showDiff = ranking[0]?.pp !== undefined;
                      return (
                        <TableRow
                          key={`${row.classement}-${row.nomEquipe}`}
                          sx={{
                            bgcolor: index % 2 === 1 ? "grey.50" : "transparent",
                            ...(ourTeam ? rowHighlight.ourTeam : {}),
                            ...(opponent && !ourTeam ? rowHighlight.opponent : {}),
                          }}
                        >
                          <TableCell sx={{ ...(ourTeam || opponent ? { fontWeight: 600 } : {}) }}>
                            {row.classement}
                          </TableCell>
                          <TableCell
                            sx={{
                              maxWidth: 280,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              ...(ourTeam || opponent ? { fontWeight: 600 } : {}),
                            }}
                          >
                            {row.nomEquipe}
                          </TableCell>
                          <TableCell align="right">{row.points}</TableCell>
                          <TableCell align="center">{row.matchJouees}</TableCell>
                          <TableCell align="center">
                            {row.victoires}/{row.egalites}/{row.defaites}
                          </TableCell>
                          {showPourContre && (
                            <TableCell align="center">
                              {row.pf !== undefined || row.pg !== undefined
                                ? `${row.pf ?? "–"}/${row.pg ?? "–"}`
                                : "–"}
                            </TableCell>
                          )}
                          {showDiff && (
                            <TableCell align="center" sx={{ ...(ourTeam || opponent ? { fontWeight: 600 } : {}) }}>
                              {row.pp !== undefined ? (row.pp > 0 ? `+${row.pp}` : String(row.pp)) : "–"}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </>
            )}
            {!loading && !error && ranking && ranking.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
                Aucun classement disponible.
              </Typography>
            )}
          </Box>
        </Box>
      </Popover>
    </>
  );
}
