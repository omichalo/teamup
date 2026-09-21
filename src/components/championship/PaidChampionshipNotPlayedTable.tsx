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
import type { PaidChampionshipNotPlayedItem } from "@/lib/championship/paid-championship-not-played";
import {
  REGISTRATION_STATUS_LABELS,
  type RegistrationStatus,
} from "@/lib/club-registration/registration-status";

function statusLabel(status: string | null): string {
  if (!status) return "—";
  if (status in REGISTRATION_STATUS_LABELS) {
    return REGISTRATION_STATUS_LABELS[status as RegistrationStatus];
  }
  return status;
}

type Props = {
  items: PaidChampionshipNotPlayedItem[];
};

export function PaidChampionshipNotPlayedTable({ items }: Props) {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Joueur</TableCell>
            <TableCell>Licence</TableCell>
            <TableCell>Statut dossier</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={`${item.personKey}:${item.competition}:${item.registrationId}`}
              hover
            >
              <TableCell>
                <Typography fontWeight={600}>{item.displayName}</Typography>
              </TableCell>
              <TableCell>{item.ffttLicense ?? "—"}</TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {statusLabel(item.registrationStatus)}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
