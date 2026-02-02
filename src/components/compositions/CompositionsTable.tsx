"use client";

import React from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
} from "@mui/material";

/** Format attendu pour afficher un tableau joueurs × matchs (compositions adverses ou notre équipe). */
export interface MatchCompositionRow {
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

function isMissingPlayer(j: { nom: string; prenom: string }): boolean {
  const nomTrim = (j.nom ?? "").trim();
  const prenomTrim = (j.prenom ?? "").trim();
  return nomTrim === "" && prenomTrim === "";
}

function playerKey(j: { nom: string; prenom: string; licence?: string }): PlayerKey {
  const licence = (j.licence ?? "").trim();
  if (licence) return licence;
  return `${(j.nom ?? "").trim()}|${(j.prenom ?? "").trim()}`;
}

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

function findPlayerPositionInMatch(
  key: PlayerKey,
  composition: MatchCompositionRow["composition"]
): number {
  return composition.findIndex((j) => playerKey(j) === key);
}

export interface CompositionsTableProps {
  matches: MatchCompositionRow[];
}

/** Tableau joueurs × journées : une ligne par joueur, une colonne par match. */
export function CompositionsTable({ matches }: CompositionsTableProps) {
  const { allPlayers, cellByPlayerAndMatch } = React.useMemo(() => {
    const keyToPlayer = new Map<
      PlayerKey,
      { nom: string; prenom: string; points: number | null; licence?: string }
    >();
    for (const m of matches) {
      for (const j of m.composition) {
        if (isMissingPlayer(j)) continue;
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
