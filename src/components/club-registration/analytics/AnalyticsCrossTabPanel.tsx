"use client";

import { useState } from "react";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  type SelectChangeEvent,
} from "@mui/material";
import { buildCrossTab, CROSS_TAB_AXIS_OPTIONS } from "@/lib/club-registration/analytics/cross-tab";
import type { AnalyticsRegistrationRecord, CrossTabAxis } from "@/lib/club-registration/analytics/types";

type AnalyticsCrossTabPanelProps = {
  records: AnalyticsRegistrationRecord[];
  seasonLabel: string;
  sectionLabels: Record<string, string>;
};

function heatColor(value: number, max: number): string {
  if (max <= 0 || value <= 0) return "transparent";
  const ratio = value / max;
  const alpha = 0.12 + ratio * 0.45;
  return `rgba(21, 101, 192, ${alpha.toFixed(2)})`;
}

export function AnalyticsCrossTabPanel({
  records,
  seasonLabel,
  sectionLabels,
}: AnalyticsCrossTabPanelProps) {
  const [rowAxis, setRowAxis] = useState<CrossTabAxis>("mainSection");
  const [colAxis, setColAxis] = useState<CrossTabAxis>("sex");

  const result = buildCrossTab(records, rowAxis, colAxis, seasonLabel, sectionLabels);
  const maxCell = result.counts.flat().reduce((max, value) => Math.max(max, value), 0);

  const handleRowAxis = (event: SelectChangeEvent) => {
    setRowAxis(event.target.value as CrossTabAxis);
  };

  const handleColAxis = (event: SelectChangeEvent) => {
    setColAxis(event.target.value as CrossTabAxis);
  };

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel id="cross-row-axis">Axe lignes</InputLabel>
          <Select labelId="cross-row-axis" label="Axe lignes" value={rowAxis} onChange={handleRowAxis}>
            {CROSS_TAB_AXIS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel id="cross-col-axis">Axe colonnes</InputLabel>
          <Select labelId="cross-col-axis" label="Axe colonnes" value={colAxis} onChange={handleColAxis}>
            {CROSS_TAB_AXIS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {records.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Aucune donnée pour ce filtre.
        </Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell />
                {result.colLabels.map((label) => (
                  <TableCell key={label} align="right">
                    {label}
                  </TableCell>
                ))}
                <TableCell align="right">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {result.rowLabels.map((rowLabel, rowIndex) => (
                <TableRow key={rowLabel}>
                  <TableCell component="th" scope="row">
                    {rowLabel}
                  </TableCell>
                  {result.colLabels.map((_, colIndex) => {
                    const value = result.counts[rowIndex]?.[colIndex] ?? 0;
                    return (
                      <TableCell
                        key={`${rowLabel}-${colIndex}`}
                        align="right"
                        sx={{ backgroundColor: heatColor(value, maxCell) }}
                      >
                        {value}
                      </TableCell>
                    );
                  })}
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {result.rowTotals[rowIndex]}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>
                  Total
                </TableCell>
                {result.colTotals.map((total, index) => (
                  <TableCell key={`total-${index}`} align="right" sx={{ fontWeight: 600 }}>
                    {total}
                  </TableCell>
                ))}
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {records.length}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}
