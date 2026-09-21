"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { PageHeader } from "@/components/ui";
import type { UnregisteredPlayListItem } from "@/lib/championship/list-unregistered-play";
import type { PaidChampionshipNotPlayedItem } from "@/lib/championship/paid-championship-not-played";
import {
  UNREGISTERED_PLAY_COMPETITION_LABELS,
  UNREGISTERED_PLAY_FEE_EUR,
  type UnregisteredPlayCompetition,
  type UnregisteredPlayPaymentStatus,
} from "@/lib/championship/unregistered-play-follow-up";
import { PaidChampionshipNotPlayedTable } from "./PaidChampionshipNotPlayedTable";
import { UnregisteredPlayFollowUpTable } from "./UnregisteredPlayFollowUpTable";

type FollowUpMode = "played_without_option" | "paid_without_play";

type ListResponse = {
  seasonLabel: string;
  items: UnregisteredPlayListItem[];
  paidWithoutPlay?: PaidChampionshipNotPlayedItem[];
};

const MODE_LABELS: Record<FollowUpMode, string> = {
  played_without_option: "A joué sans option",
  paid_without_play: "Payé sans avoir joué",
};

export function UnregisteredPlayFollowUpContainer() {
  const [seasonLabel, setSeasonLabel] = useState<string>("");
  const [items, setItems] = useState<UnregisteredPlayListItem[]>([]);
  const [paidWithoutPlay, setPaidWithoutPlay] = useState<
    PaidChampionshipNotPlayedItem[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [mode, setMode] = useState<FollowUpMode>("played_without_option");
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
      setPaidWithoutPlay(data.paidWithoutPlay ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredPlayed = useMemo(
    () => items.filter((item) => item.competition === tab),
    [items, tab]
  );

  const filteredPaid = useMemo(
    () => paidWithoutPlay.filter((item) => item.competition === tab),
    [paidWithoutPlay, tab]
  );

  const filtered =
    mode === "played_without_option" ? filteredPlayed : filteredPaid;

  const counts = useMemo(() => {
    const source =
      mode === "played_without_option" ? items : paidWithoutPlay;
    return {
      equipe: source.filter((i) => i.competition === "equipe").length,
      paris: source.filter((i) => i.competition === "paris").length,
    };
  }, [items, mode, paidWithoutPlay]);

  const modeCounts = useMemo(
    () => ({
      played_without_option: items.length,
      paid_without_play: paidWithoutPlay.length,
    }),
    [items.length, paidWithoutPlay.length]
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
        title="Suivi championnat"
        subtitle={
          seasonLabel
            ? `Saison ${seasonLabel} — joueurs hors option ou option payée sans match`
            : "Joueurs hors option ou option payée sans match"
        }
        marginBottom={2}
      />

      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Tabs
          value={mode}
          onChange={(_, value: FollowUpMode) => setMode(value)}
          variant="fullWidth"
        >
          <Tab
            value="played_without_option"
            label={`${MODE_LABELS.played_without_option} (${modeCounts.played_without_option})`}
          />
          <Tab
            value="paid_without_play"
            label={`${MODE_LABELS.paid_without_play} (${modeCounts.paid_without_play})`}
          />
        </Tabs>
      </Paper>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {mode === "played_without_option"
          ? `Saisir le suivi d’encaissement complémentaire (${UNREGISTERED_PLAY_FEE_EUR.equipe}\u00a0€ équipes / ${UNREGISTERED_PLAY_FEE_EUR.paris}\u00a0€ Paris) : pas de paiement, demandé ou payé.`
          : "Joueurs dont le dossier inclut l’option championnat (payée ou approuvée) et qui n’ont pas encore joué de match dans cette compétition."}
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
      ) : mode === "played_without_option" ? (
        <UnregisteredPlayFollowUpTable
          items={filteredPlayed}
          savingKey={savingKey}
          onUpdateStatus={(item, paymentStatus) => {
            void updateStatus(item, paymentStatus);
          }}
        />
      ) : (
        <PaidChampionshipNotPlayedTable items={filteredPaid} />
      )}
    </Box>
  );
}
