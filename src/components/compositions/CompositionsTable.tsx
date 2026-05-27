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

import { buildPlayersByMatchIndex } from "./compositions-table-utils";

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

export interface CompositionsTableProps {
  matches: MatchCompositionRow[];
}

/** Tableau joueurs × journées : une ligne par joueur, une colonne par match. */
export function CompositionsTable({ matches }: CompositionsTableProps) {
  const { allPlayers, cellByPlayerAndMatch } = React.useMemo(
    () => buildPlayersByMatchIndex(matches),
    [matches]
  );

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
                    {m.journee && m.journee > 0 && m.journee !== idx + 1
                      ? ` (journée FFTT ${m.journee})`
                      : ""}
                  </Box>
                }
                placement="top"
              >
                <span style={{ cursor: "help", textDecoration: "underline dotted" }}>
                  J{idx + 1}
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
                nom: nom ?? "",
                prenom: prenom ?? "",
                ...(points !== undefined ? { points } : {}),
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
