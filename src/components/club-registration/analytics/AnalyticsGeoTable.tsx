"use client";

import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import type { TopCountBucket } from "@/lib/club-registration/analytics/types";

type AnalyticsGeoTableProps = {
  title: string;
  bucket: TopCountBucket;
};

export function AnalyticsGeoTable({ title, bucket }: AnalyticsGeoTableProps) {
  const rows = [
    ...bucket.top,
    ...(bucket.other > 0 ? [{ label: "Autres", count: bucket.other }] : []),
    ...(bucket.unknown > 0 ? [{ label: "Non renseigné", count: bucket.unknown }] : []),
  ];

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        {title}
      </Typography>
      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Aucune donnée.
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Libellé</TableCell>
                <TableCell align="right">Effectif</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.label}>
                  <TableCell>{row.label}</TableCell>
                  <TableCell align="right">{row.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}
