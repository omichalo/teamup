"use client";

import {
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Paper,
} from "@mui/material";
import type { UnregisteredPlayListItem } from "@/lib/championship/list-unregistered-play";
import {
  UNREGISTERED_PLAY_PAYMENT_STATUS_LABELS,
  UNREGISTERED_PLAY_PAYMENT_STATUS_VALUES,
  type UnregisteredPlayPaymentStatus,
} from "@/lib/championship/unregistered-play-follow-up";
import { COMPETITION_OPTIONS } from "@/lib/club-registration/constants";
import { COMPETITIONS_JEUNES_ID } from "@/lib/club-registration/competition-ids";

const COMPETITION_LABEL_BY_ID: Record<string, string> = {
  [COMPETITIONS_JEUNES_ID]: "Compétitions jeunes",
  ...Object.fromEntries(
    COMPETITION_OPTIONS.map((option) => [
      option.id,
      option.label.replace(/\s*\([^)]*\)\s*$/u, "").trim(),
    ])
  ),
};

function competitionOptionLabel(id: string): string {
  return COMPETITION_LABEL_BY_ID[id] ?? id.replaceAll("_", " ");
}

function dossierSummary(item: UnregisteredPlayListItem): string {
  if (!item.registrationId) return "Aucun dossier";
  if (item.dossierCompetitionIds.length === 0) {
    return "Aucune option championnat";
  }
  return item.dossierCompetitionIds.map(competitionOptionLabel).join(", ");
}

type Props = {
  items: UnregisteredPlayListItem[];
  savingKey: string | null;
  onUpdateStatus: (
    item: UnregisteredPlayListItem,
    paymentStatus: UnregisteredPlayPaymentStatus
  ) => void;
};

export function UnregisteredPlayFollowUpTable({
  items,
  savingKey,
  onUpdateStatus,
}: Props) {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Joueur</TableCell>
            <TableCell>Licence</TableCell>
            <TableCell>Options au dossier</TableCell>
            <TableCell>Suivi paiement</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => {
            const rowKey = `${item.personKey}:${item.competition}`;
            const saving = savingKey === rowKey;
            return (
              <TableRow key={rowKey} hover>
                <TableCell>
                  <Stack spacing={0.5}>
                    <Typography fontWeight={600}>{item.displayName}</Typography>
                    {item.coachIncluded && (
                      <Chip
                        size="small"
                        label="Ajout coach"
                        variant="outlined"
                      />
                    )}
                  </Stack>
                </TableCell>
                <TableCell>{item.ffttLicense ?? "—"}</TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {dossierSummary(item)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    color="primary"
                    disabled={saving}
                    value={item.paymentStatus}
                    onChange={(_, value: UnregisteredPlayPaymentStatus | null) => {
                      if (!value) return;
                      onUpdateStatus(item, value);
                    }}
                    aria-label={`Suivi paiement ${item.displayName}`}
                  >
                    {UNREGISTERED_PLAY_PAYMENT_STATUS_VALUES.map((status) => (
                      <ToggleButton key={status} value={status}>
                        {UNREGISTERED_PLAY_PAYMENT_STATUS_LABELS[status]}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
