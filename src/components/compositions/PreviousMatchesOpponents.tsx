"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Popover,
  IconButton,
  CircularProgress,
  Alert,
  Tooltip,
} from "@mui/material";
import { History as HistoryIcon } from "@mui/icons-material";
import {
  CompositionsTable,
  type MatchCompositionRow,
} from "@/components/compositions/CompositionsTable";

/** Même format que MatchCompositionRow (conservé pour compatibilité API / popover adverses). */
export type OpponentMatchComposition = MatchCompositionRow;

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

/** Hook : récupération des compositions adverses (pas de timer de préchargement). */
export function useOpponentCompositions(
  teamId: string,
  phase: "aller" | "retour" | null,
  opponentName: string | null,
  maxMatches = 10
) {
  const [matches, setMatches] = useState<OpponentMatchComposition[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCompositions = useCallback(async () => {
    if (!opponentName?.trim() || !phase || !teamId?.trim()) {
      setMatches(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        teamId: teamId.trim(),
        phase,
        opponentName: opponentName.trim(),
      });
      const res = await fetch(`/api/fftt/opponent-compositions?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Erreur ${res.status}`);
        setMatches(null);
        return;
      }
      const data = (await res.json()) as { matches: OpponentMatchComposition[] };
      const list = Array.isArray(data.matches) ? data.matches : [];
      setMatches(list.slice(0, maxMatches));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Erreur lors du chargement"
      );
      setMatches(null);
    } finally {
      setLoading(false);
    }
  }, [teamId, phase, opponentName, maxMatches]);

  useEffect(() => {
    setMatches(null);
    setError(null);
  }, [teamId, phase, opponentName]);

  return { matches, loading, error, fetch: fetchCompositions };
}

export interface OpponentCompositionsPopoverProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  opponentName: string;
  matches: OpponentMatchComposition[] | null;
  loading: boolean;
  error: string | null;
  trigger: React.ReactNode;
}

/** Composant présentiel : popover "Compositions adverses" sans appel API. */
export function OpponentCompositionsPopover({
  open,
  anchorEl,
  onClose,
  opponentName,
  matches,
  loading,
  error,
  trigger,
}: OpponentCompositionsPopoverProps) {
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
    </Box>
  );

  return (
    <>
      {trigger}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={onClose}
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

const PREFETCH_DELAY_MS = 250;

export function PreviousMatchesOpponents({
  teamId,
  phase,
  opponentName,
  maxMatches = 10,
}: PreviousMatchesOpponentsProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const prefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { matches, loading, error, fetch } = useOpponentCompositions(
    teamId,
    phase,
    opponentName,
    maxMatches
  );
  const stateRef = useRef({ matches, loading });
  stateRef.current = { matches, loading };

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setTooltipOpen(false);
    setAnchorEl(event.currentTarget);
    if (matches === null && !loading) {
      void fetch();
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMouseEnter = () => {
    if (matches !== null || loading) return;
    prefetchTimerRef.current = setTimeout(() => {
      prefetchTimerRef.current = null;
      if (stateRef.current.matches === null && !stateRef.current.loading) {
        void fetch();
      }
    }, PREFETCH_DELAY_MS);
  };

  const handleMouseLeave = () => {
    if (prefetchTimerRef.current) {
      clearTimeout(prefetchTimerRef.current);
      prefetchTimerRef.current = null;
    }
  };

  const open = Boolean(anchorEl);

  if (!opponentName?.trim()) {
    return null;
  }

  const trigger = (
    <Tooltip
      title="Compositions de l'équipe adverse lors de ses précédents matchs"
      open={open ? false : tooltipOpen}
      onOpen={() => {
        if (!open) setTooltipOpen(true);
      }}
      onClose={() => setTooltipOpen(false)}
    >
      <span
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
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
  );

  return (
    <OpponentCompositionsPopover
      open={open}
      anchorEl={anchorEl}
      onClose={handleClose}
      opponentName={opponentName.trim()}
      matches={matches}
      loading={loading}
      error={error}
      trigger={trigger}
    />
  );
}
