"use client";

import React from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Stack,
} from "@mui/material";
import { Home, FlightTakeoff } from "@mui/icons-material";
import type { Match } from "@/types";
import { formatLastNameForDisplay } from "@/lib/shared/person-name-format";

function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function formatTime(date: string | Date): string {
  const dateObj = new Date(date);
  if (dateObj.getHours() === 0 && dateObj.getMinutes() === 0) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(dateObj);
}

function getResultChip(match: Match): React.ReactNode {
  if (match.result === "EXEMPT") return <Chip label="Exempt" size="small" color="info" />;
  if (match.result === "W.O.") return <Chip label="W.O." size="small" color="error" />;
  if (match.result === "VICTOIRE") return <Chip label="Victoire" size="small" color="success" />;
  if (match.result === "DEFAITE" || match.result === "DÉFAITE") return <Chip label="Défaite" size="small" color="error" />;
  if (match.result === "NUL" || match.result === "ÉGALITÉ") {
    if (match.score === "0-0") return <Chip label="À venir" size="small" color="default" variant="outlined" />;
    return <Chip label="Nul" size="small" color="warning" />;
  }
  return <Chip label="À venir" size="small" color="default" variant="outlined" />;
}

/** Liste compacte des joueurs d'une équipe (nom, points). */
function MatchCompositionsInline({
  joueurs,
  label,
  bgColor,
}: {
  joueurs: Record<string, { nom: string; prenom: string; points?: number }>;
  label: string;
  bgColor: string;
}) {
  const entries = Object.entries(joueurs ?? {});
  if (entries.length === 0) return null;
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 1,
        bgcolor: bgColor,
        flex: 1,
        minWidth: 0,
      }}
    >
      <Typography variant="caption" fontWeight={600} sx={{ display: "block", mb: 0.5 }}>
        {label}
      </Typography>
      <Stack spacing={0.25}>
        {entries.map(([, j]) => (
          <Typography key={`${j.nom}-${j.prenom}`} variant="body2" sx={{ fontSize: "0.8125rem" }}>
            {j.prenom} {formatLastNameForDisplay(j.nom)}
            {typeof j.points === "number" ? ` — ${j.points} pts` : ""}
          </Typography>
        ))}
      </Stack>
    </Box>
  );
}

/** Liste compacte des parties (Joueur1 scoreA-scoreB Joueur2). */
function MatchPartiesInline({
  parties,
}: {
  parties: Array<{
    joueurA: string;
    joueurB: string;
    scoreA: number;
    scoreB: number;
    setDetails?: string[];
  }>;
}) {
  if (!parties?.length) return null;
  return (
    <Stack spacing={0.5} sx={{ mt: 1 }}>
      {parties.map((p, i) => (
        <Box
          key={i}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            py: 0.25,
            borderBottom: i < parties.length - 1 ? 1 : 0,
            borderColor: "divider",
          }}
        >
          <Typography variant="body2" sx={{ flex: 1, textAlign: "right", fontSize: "0.8125rem" }} noWrap>
            {p.joueurA || "—"}
          </Typography>
          <Typography variant="body2" fontWeight={600} sx={{ minWidth: 48, textAlign: "center" }}>
            {p.scoreA}–{p.scoreB}
          </Typography>
          <Typography variant="body2" sx={{ flex: 1, fontSize: "0.8125rem" }} noWrap>
            {p.joueurB || "—"}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}

export interface MatchCardCompactProps {
  match: Match;
}

/** Carte compacte d'un match : tout affiché directement, sans IDs, sans lien détail. */
export function MatchCardCompact({ match }: MatchCardCompactProps) {
  const ri = match.resultatsIndividuels;
  const hasDetails = Boolean(ri?.joueursA || ri?.joueursB || (ri?.parties && ri.parties.length > 0));

  return (
    <Card
      variant="outlined"
      sx={{
        overflow: "hidden",
        transition: "box-shadow 0.2s",
        "&:hover": { boxShadow: 1 },
      }}
    >
      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
        {/* Ligne 1 : Journée, Domicile/Extérieur, Score, Résultat */}
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 1,
            mb: 1,
          }}
        >
          <Chip label={`J${match.journee}`} size="small" variant="outlined" />
          {match.isHome ? (
            <Home sx={{ fontSize: 18, color: "primary.main" }} />
          ) : (
            <FlightTakeoff sx={{ fontSize: 18, color: "text.secondary" }} />
          )}
          <Typography variant="caption" color="text.secondary">
            {match.isHome ? "Domicile" : "Extérieur"}
          </Typography>
          {match.score && (
            <Typography variant="body2" fontWeight={600}>
              {match.score}
            </Typography>
          )}
          {getResultChip(match)}
        </Box>

        {/* Ligne 2 : Date, Lieu */}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center", mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {formatDateShort(match.date)}
            {formatTime(match.date) ? ` · ${formatTime(match.date)}` : ""}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            · {match.location}
          </Typography>
        </Box>

        {/* Ligne 3 : Adversaire */}
        <Box sx={{ mb: hasDetails ? 1.5 : 0 }}>
          <Typography variant="body2">
            <strong>Adversaire :</strong> {match.opponent}
          </Typography>
        </Box>

        {/* Compositions + Parties si disponibles */}
        {hasDetails && (
          <Box sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: "divider" }}>
            {(ri?.joueursA || ri?.joueursB) && (
              <Box sx={{ display: "flex", gap: 1.5, mb: 1.5, flexWrap: "wrap" }}>
                <MatchCompositionsInline
                  joueurs={ri.joueursA ?? {}}
                  label={ri.nomEquipeA ?? "Équipe A"}
                  bgColor="primary.light"
                />
                <MatchCompositionsInline
                  joueurs={ri.joueursB ?? {}}
                  label={ri.nomEquipeB ?? "Équipe B"}
                  bgColor="secondary.light"
                />
              </Box>
            )}
            {ri?.parties && ri.parties.length > 0 && (
              <>
                <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                  Parties
                </Typography>
                <MatchPartiesInline parties={ri.parties} />
              </>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
