"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { PageHeader } from "@/components/ui";
import type { UnregisteredPlayListItem } from "@/lib/championship/list-unregistered-play";
import {
  UNREGISTERED_PLAY_COMPETITION_LABELS,
  UNREGISTERED_PLAY_FEE_EUR,
  UNREGISTERED_PLAY_PAYMENT_STATUS_LABELS,
  UNREGISTERED_PLAY_PAYMENT_STATUS_VALUES,
  type UnregisteredPlayCompetition,
  type UnregisteredPlayPaymentStatus,
} from "@/lib/championship/unregistered-play-follow-up";

type ListResponse = {
  seasonLabel: string;
  items: UnregisteredPlayListItem[];
};

function dossierSummary(item: UnregisteredPlayListItem): string {
  if (!item.registrationId) return "Aucun dossier";
  const comps =
    item.dossierCompetitionIds.length > 0
      ? item.dossierCompetitionIds.join(", ")
      : "sans compétition championnat";
  const status = item.registrationStatus ?? "—";
  return `${status} · ${comps}`;
}

export function UnregisteredPlayFollowUpContainer() {
  const [seasonLabel, setSeasonLabel] = useState<string>("");
  const [items, setItems] = useState<UnregisteredPlayListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [tab, setTab] = useState<UnregisteredPlayCompetition>("equipe");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/club/championship/unregistered-play", {
        credentials: "include",
      });
      const data = (await res.json()) as ListResponse & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Chargement impossible");
      }
      setSeasonLabel(data.seasonLabel);
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () => items.filter((item) => item.competition === tab),
    [items, tab]
  );

  const counts = useMemo(
    () => ({
      equipe: items.filter((i) => i.competition === "equipe").length,
      paris: items.filter((i) => i.competition === "paris").length,
    }),
    [items]
  );

  const updateStatus = useCallback(
    async (
      item: UnregisteredPlayListItem,
      paymentStatus: UnregisteredPlayPaymentStatus
    ) => {
      const key = `${item.personKey}:${item.competition}`;
      setSavingKey(key);
      setError(null);
      try {
        const res = await fetch(
          `/api/club/championship/unregistered-play/${encodeURIComponent(item.personKey)}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              competition: item.competition,
              paymentStatus,
            }),
          }
        );
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          throw new Error(data.error || "Mise à jour impossible");
        }
        setItems((prev) =>
          prev.map((row) =>
            row.personKey === item.personKey &&
            row.competition === item.competition
              ? { ...row, paymentStatus }
              : row
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur de mise à jour");
      } finally {
        setSavingKey(null);
      }
    },
    []
  );

  return (
    <Box sx={{ py: 3 }}>
      <PageHeader
        title="Matchs hors inscription"
        subtitle={
          seasonLabel
            ? `Saison ${seasonLabel} — joueurs ayant joué sans option championnat au dossier`
            : "Joueurs ayant joué sans option championnat au dossier"
        }
        marginBottom={2}
      />

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Saisir le suivi d’encaissement complémentaire (
        {UNREGISTERED_PLAY_FEE_EUR.equipe}&nbsp;€ équipes /{" "}
        {UNREGISTERED_PLAY_FEE_EUR.paris}&nbsp;€ Paris) : pas de paiement, demandé
        ou payé.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, value: UnregisteredPlayCompetition) => setTab(value)}
          variant="fullWidth"
        >
          <Tab
            value="equipe"
            label={`${UNREGISTERED_PLAY_COMPETITION_LABELS.equipe} (${counts.equipe})`}
          />
          <Tab
            value="paris"
            label={`${UNREGISTERED_PLAY_COMPETITION_LABELS.paris} (${counts.paris})`}
          />
        </Tabs>
      </Paper>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : filtered.length === 0 ? (
        <Alert severity="success">
          Aucun joueur concerné pour{" "}
          {UNREGISTERED_PLAY_COMPETITION_LABELS[tab].toLowerCase()}.
        </Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Joueur</TableCell>
                <TableCell>Licence</TableCell>
                <TableCell>Dossier</TableCell>
                <TableCell>Suivi paiement</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((item) => {
                const rowKey = `${item.personKey}:${item.competition}`;
                const saving = savingKey === rowKey;
                return (
                  <TableRow key={rowKey} hover>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography fontWeight={600}>
                          {item.displayName}
                        </Typography>
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
                          void updateStatus(item, value);
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
      )}
    </Box>
  );
}
