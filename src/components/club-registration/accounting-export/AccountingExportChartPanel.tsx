"use client";

import {
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import {
  SAGE_CHART_ACCOUNTS,
  SAGE_CHART_JOURNALS,
} from "@/lib/accounting-export/chart-catalog";

export function AccountingExportChartPanel() {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        Plan comptable proposé
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Numéros à confirmer sur le plan réellement ouvert dans le dossier Sage
        du club avant le premier import.
      </Typography>

      <Stack spacing={2.5}>
        <div>
          <Typography variant="subtitle2" gutterBottom>
            Journaux
          </Typography>
          <TableContainer>
            <Table size="small" aria-label="Journaux Sage">
              <TableHead>
                <TableRow>
                  <TableCell>Journal</TableCell>
                  <TableCell>Usage</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {SAGE_CHART_JOURNALS.map((row) => (
                  <TableRow key={row.code}>
                    <TableCell sx={{ fontFamily: "monospace", whiteSpace: "nowrap" }}>
                      {row.code}
                    </TableCell>
                    <TableCell>{row.usage}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </div>

        <div>
          <Typography variant="subtitle2" gutterBottom>
            Comptes
          </Typography>
          <TableContainer sx={{ maxHeight: 360 }}>
            <Table size="small" stickyHeader aria-label="Plan de comptes Sage">
              <TableHead>
                <TableRow>
                  <TableCell>Compte</TableCell>
                  <TableCell>Intitulé</TableCell>
                  <TableCell>Sens habituel</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {SAGE_CHART_ACCOUNTS.map((row) => (
                  <TableRow key={row.account}>
                    <TableCell sx={{ fontFamily: "monospace", whiteSpace: "nowrap" }}>
                      {row.account}
                    </TableCell>
                    <TableCell>{row.label}</TableCell>
                    <TableCell>{row.usualSense}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      </Stack>
    </Paper>
  );
}
