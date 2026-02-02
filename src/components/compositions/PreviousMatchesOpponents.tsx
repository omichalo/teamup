"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Box,
  Typography,
  Popover,
  Collapse,
  IconButton,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
} from "@mui/material";
import { ExpandMore, ExpandLess, BugReport as BugReportIcon, History as HistoryIcon } from "@mui/icons-material";

/** Type du diagnostic renvoyé par l’API quand ?debug=1. */
export interface OpponentCompositionsDebug {
  opponentName: string;
  phase: string;
  teamId: string;
  matchCount: number;
  matches: Array<{
    date: string;
    otherTeamName: string;
    detailsNomEquipeA: string;
    detailsNomEquipeB: string;
    opponentName: string;
    sidePicked: "A" | "B" | "fallback";
    joueursFromDetails: Array<{
      nom: string;
      prenom: string;
      licence: string | undefined;
      points: number | null | undefined;
    }>;
    enrichment: Array<{
      nom: string;
      prenom: string;
      licence: string | null | undefined;
      hadPointsBefore: boolean;
      calledApi: boolean;
      apiResponseKeys?: string[];
      pointsAfter: number | null;
      error?: string;
    }>;
  }>;
}

export interface OpponentMatchComposition {
  date: string;
  journee?: number;
  otherTeamName: string;
  score?: string;
  composition: Array<{
    nom: string;
    prenom: string;
    points?: number | null;
    licence?: string;
    victoires?: number;
    defaites?: number;
  }>;
}

export interface PreviousMatchesOpponentsProps {
  /** ID de notre équipe (ex: sqyping_team_12345_aller) */
  teamId: string;
  /** Phase sélectionnée (aller | retour) pour la poule FFTT */
  phase: "aller" | "retour" | null;
  /** Nom de l'équipe adverse du match de la journée (pour afficher ses compositions passées) */
  opponentName: string | null;
  /** Nombre max de matchs à afficher (défaut 5) */
  maxMatches?: number;
}

/** Format date FR */
function formatDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split("-");
    if (y && m && d) {
      return `${d}/${m}/${y}`;
    }
  } catch {
    // ignore
  }
  return dateStr;
}

type PlayerKey = string;

/** Clé unique pour un joueur (licence si dispo, sinon nom|prenom). */
function playerKey(j: { nom: string; prenom: string; licence?: string }): PlayerKey {
  const licence = (j.licence ?? "").trim();
  if (licence) return licence;
  return `${(j.nom ?? "").trim()}|${(j.prenom ?? "").trim()}`;
}

/** Format joueur : prénom + NOM (optionnel: pts). */
function formatPlayerLabel(j: {
  nom: string;
  prenom: string;
  points?: number | null;
  licence?: string;
}): string {
  const prenom = (j.prenom ?? "").trim();
  const nom = (j.nom ?? "").trim().toUpperCase();
  const namePart =
    prenom && nom ? `${prenom} ${nom}` : prenom || nom || "—";
  const pts =
    typeof j.points === "number"
      ? ` — ${j.points} pts`
      : "";
  return `${namePart}${pts}`;
}

/** Trouve l'index du joueur dans la composition d'un match (0-based). Retourne -1 si absent. */
function findPlayerPositionInMatch(
  key: PlayerKey,
  composition: OpponentMatchComposition["composition"]
): number {
  return composition.findIndex((j) => playerKey(j) === key);
}

/** Tableau joueurs × journées : une ligne par joueur, une colonne par match. */
function CompositionsTable({ matches }: { matches: OpponentMatchComposition[] }) {
  const { allPlayers, cellByPlayerAndMatch } = React.useMemo(() => {
    const keyToPlayer = new Map<
      PlayerKey,
      { nom: string; prenom: string; points: number | null; licence?: string }
    >();
    for (const m of matches) {
      for (const j of m.composition) {
        const k = playerKey(j);
        if (!keyToPlayer.has(k)) {
          keyToPlayer.set(k, {
            nom: j.nom,
            prenom: j.prenom,
            points: j.points ?? null,
            ...(j.licence ? { licence: j.licence } : {}),
          });
        }
      }
    }
    const allPlayers = Array.from(keyToPlayer.entries()).map(([key, p]) => ({ key, ...p }));
    const cellByPlayerAndMatch = new Map<
      string,
      { position: number; victoires: number; defaites: number }
    >();
    for (const { key } of allPlayers) {
      for (let matchIdx = 0; matchIdx < matches.length; matchIdx++) {
        const compo = matches[matchIdx].composition;
        const pos = findPlayerPositionInMatch(key, compo);
        const cellKey = `${key}|${matchIdx}`;
        if (pos >= 0) {
          const j = compo[pos];
          const victoires = typeof j.victoires === "number" ? j.victoires : 0;
          const defaites = typeof j.defaites === "number" ? j.defaites : 0;
          cellByPlayerAndMatch.set(cellKey, {
            position: pos + 1,
            victoires,
            defaites,
          });
        }
      }
    }
    return { allPlayers, cellByPlayerAndMatch };
  }, [matches]);

  if (allPlayers.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
        Aucune composition disponible.
      </Typography>
    );
  }

  return (
    <Table size="small" stickyHeader sx={{ "& .MuiTableCell-root": { fontSize: "0.8125rem" } }}>
      <TableHead>
        <TableRow sx={{ bgcolor: "grey.100" }}>
          <TableCell sx={{ fontWeight: 700, color: "grey.700", minWidth: 200 }}>
            Joueur
          </TableCell>
          {matches.map((m, idx) => (
            <TableCell
              key={idx}
              align="center"
              sx={{
                fontWeight: 700,
                color: "grey.700",
                minWidth: 80,
                whiteSpace: "nowrap",
              }}
            >
              <Tooltip
                title={
                  <Box component="span" sx={{ display: "block" }}>
                    <strong>{m.otherTeamName}</strong>
                    <br />
                    {formatDate(m.date)}
                    {m.score != null ? ` — ${m.score}` : ""}
                  </Box>
                }
                placement="top"
              >
                <span style={{ cursor: "help", textDecoration: "underline dotted" }}>
                  J{m.journee ?? idx + 1}
                </span>
              </Tooltip>
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {allPlayers.map(({ key, nom, prenom, points, licence }) => (
          <TableRow key={key} hover sx={{ "&:nth-of-type(even)": { bgcolor: "grey.50" } }}>
            <TableCell sx={{ fontWeight: 500 }}>
              {formatPlayerLabel({
                nom,
                prenom,
                points,
                ...(licence ? { licence } : {}),
              })}
            </TableCell>
            {matches.map((_, matchIdx) => {
              const cell = cellByPlayerAndMatch.get(`${key}|${matchIdx}`);
              if (!cell) {
                return (
                  <TableCell key={matchIdx} align="center" sx={{ color: "text.secondary" }}>
                    —
                  </TableCell>
                );
              }
              return (
                <TableCell key={matchIdx} align="center">
                  <Box component="span" sx={{ display: "block", lineHeight: 1.2 }}>
                    <span title="Position dans la composition">Pos. {cell.position}</span>
                    <Typography
                      component="span"
                      variant="caption"
                      display="block"
                      color="text.secondary"
                      sx={{ fontSize: "0.7rem" }}
                      title="Victoires - Défaites (parties individuelles)"
                    >
                      {cell.victoires}V-{cell.defaites}D
                    </Typography>
                  </Box>
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function PreviousMatchesOpponents({
  teamId,
  phase,
  opponentName,
  maxMatches = 10,
}: PreviousMatchesOpponentsProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [matches, setMatches] = useState<OpponentMatchComposition[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugData, setDebugData] = useState<OpponentCompositionsDebug | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  const isDebugMode = typeof window !== "undefined" && window.location.search.includes("debug=1");

  const fetchCompositions = useCallback(async () => {
    if (!opponentName?.trim() || !phase || !teamId?.trim()) {
      setMatches(null);
      setDebugData(null);
      return;
    }
    setLoading(true);
    setError(null);
    setDebugData(null);
    try {
      const params = new URLSearchParams({
        teamId: teamId.trim(),
        phase,
        opponentName: opponentName.trim(),
      });
      if (isDebugMode) {
        params.set("debug", "1");
      }
      const res = await fetch(`/api/fftt/opponent-compositions?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Erreur ${res.status}`);
        setMatches(null);
        return;
      }
      const data = (await res.json()) as {
        matches: OpponentMatchComposition[];
        _debug?: OpponentCompositionsDebug;
      };
      const list = Array.isArray(data.matches) ? data.matches : [];
      setMatches(list.slice(0, maxMatches));
      if (data._debug) {
        setDebugData(data._debug);
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Erreur lors du chargement"
      );
      setMatches(null);
    } finally {
      setLoading(false);
    }
  }, [teamId, phase, opponentName, maxMatches, isDebugMode]);

  useEffect(() => {
    setMatches(null);
    setDebugData(null);
    setError(null);
  }, [teamId, phase, opponentName]);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setTooltipOpen(false);
    setAnchorEl(event.currentTarget);
    if (matches === null && !loading) {
      void fetchCompositions();
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  if (!opponentName?.trim()) {
    return null;
  }

  const popoverContent = (
    <Box sx={{ mt: 1 }}>
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}
      {error && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
      {!loading && !error && matches !== null && matches.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
          Aucun match précédent trouvé pour cette équipe dans la poule.
        </Typography>
      )}
      {!loading && !error && matches && matches.length > 0 && (
        <CompositionsTable matches={matches} />
      )}

      {debugData && (
        <Box sx={{ mt: 2 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              cursor: "pointer",
              color: "text.secondary",
              "&:hover": { color: "primary.main" },
            }}
            onClick={() => setShowDebug((d) => !d)}
            role="button"
            aria-expanded={showDebug}
          >
            <BugReportIcon fontSize="small" />
            <Typography variant="caption" fontWeight={600}>
              Diagnostic (analyse du souci)
            </Typography>
            <IconButton size="small">
              {showDebug ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
          <Collapse in={showDebug}>
            <Box
              sx={{
                mt: 1,
                p: 1.5,
                bgcolor: "grey.100",
                borderRadius: 1,
                fontSize: "0.75rem",
                fontFamily: "monospace",
                overflow: "auto",
                maxHeight: 400,
              }}
            >
              <Typography variant="caption" component="div" sx={{ fontWeight: 600, mb: 1 }}>
                Contexte : opponentName=&quot;{debugData.opponentName}&quot;, phase={debugData.phase}, teamId={debugData.teamId}, {debugData.matchCount} match(s).
              </Typography>
              {debugData.matches.map((md, idx) => (
                <Box key={idx} sx={{ mb: 2 }}>
                  <Typography variant="caption" component="div" sx={{ fontWeight: 600 }}>
                    Match {idx + 1} : {md.date} — {md.otherTeamName}
                  </Typography>
                  <Typography variant="caption" component="div" color="text.secondary">
                    details: A=&quot;{md.detailsNomEquipeA}&quot;, B=&quot;{md.detailsNomEquipeB}&quot; → sidePicked={md.sidePicked}
                  </Typography>
                  <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
                    Joueurs (getDetailsRencontreByLien) : {md.joueursFromDetails.length} —{" "}
                    {md.joueursFromDetails.map((j) => `${j.prenom} ${j.nom} (licence=${j.licence ?? "—"}, points=${j.points ?? "—"})`).join(" ; ")}
                  </Typography>
                  <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
                    Enrichissement : {md.enrichment.map((e) => `${e.prenom} ${e.nom}: licence=${e.licence ?? "—"}, hadPointsBefore=${e.hadPointsBefore}, calledApi=${e.calledApi}${e.apiResponseKeys ? `, apiKeys=[${e.apiResponseKeys.join(", ")}]` : ""}, pointsAfter=${e.pointsAfter ?? "—"}${e.error ? `, error=${e.error}` : ""}`).join(" | ")}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Collapse>
        </Box>
      )}
    </Box>
  );

  return (
    <>
      <Tooltip
        title="Compositions de l'équipe adverse lors de ses précédents matchs"
        open={open ? false : tooltipOpen}
        onOpen={() => {
          if (!open) setTooltipOpen(true);
        }}
        onClose={() => setTooltipOpen(false)}
      >
        <span>
          <IconButton
            size="small"
            onClick={handleOpen}
            aria-label="Compositions de l'équipe adverse lors de ses précédents matchs"
            color="default"
            sx={{ ml: 0.25 }}
          >
            <HistoryIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{
          elevation: 8,
          sx: {
            minWidth: 560,
            width: "max-content",
            maxWidth: "min(95vw, 880px)",
            maxHeight: "min(75vh, 560px)",
            borderRadius: 2,
            overflow: "hidden",
          },
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%", maxHeight: "min(75vh, 560px)" }}>
          <Box
            sx={{
              px: 2,
              py: 1.5,
              bgcolor: "primary.main",
              color: "primary.contrastText",
            }}
          >
            <Typography variant="subtitle1" fontWeight={600}>
              Compositions adverses
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9, display: "block", mt: 0.25 }}>
              {opponentName}
            </Typography>
          </Box>
          <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
            {popoverContent}
          </Box>
        </Box>
      </Popover>
    </>
  );
}
