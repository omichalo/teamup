"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import type { CampCatalogPricing, CampPricingRates } from "@/lib/camps/types";
import { centsToEurosInput } from "./camp-pricing-draft";

type Props = {
  disabled?: boolean | undefined;
  onApplied: (payload: {
    catalogPricingId: string;
    rates: CampPricingRates;
  }) => void;
};

export function CampAssignPricingFromCatalog({
  disabled = false,
  onApplied,
}: Props) {
  const [pricings, setPricings] = useState<CampCatalogPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/club/camps/catalog/pricings", {
          credentials: "include",
        });
        const json = (await res.json()) as {
          pricings?: CampCatalogPricing[];
          error?: string;
        };
        if (!res.ok) throw new Error(json.error ?? "Catalogue tarifs indisponible");
        if (!cancelled) {
          const active = (json.pricings ?? []).filter((p) => p.active);
          setPricings(active);
          if (active[0]) setSelectedId(active[0].id);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erreur");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = pricings.find((p) => p.id === selectedId) ?? null;

  if (loading) {
    return (
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <CircularProgress size={18} />
        <Typography variant="body2">Chargement des grilles…</Typography>
      </Stack>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>;
  }

  if (pricings.length === 0) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        Aucune grille dans le catalogue. Créez-en une dans Catalogue stages →
        Tarifs.
      </Alert>
    );
  }

  return (
    <Stack spacing={1.5} sx={{ mb: 2 }}>
      <FormControl size="small" fullWidth disabled={disabled}>
        <InputLabel id="catalog-pricing-label">Grille catalogue</InputLabel>
        <Select
          labelId="catalog-pricing-label"
          label="Grille catalogue"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          {pricings.map((pricing) => (
            <MenuItem key={pricing.id} value={pricing.id}>
              {pricing.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {selected ? (
        <Typography variant="caption" color="text.secondary">
          Adh. {centsToEurosInput(selected.rates.memberDayCents)}€/j ·{" "}
          {centsToEurosInput(selected.rates.memberWeekCents)}€/sem — Non-adh.{" "}
          {centsToEurosInput(selected.rates.nonMemberDayCents)}€/j ·{" "}
          {centsToEurosInput(selected.rates.nonMemberWeekCents)}€/sem — Session{" "}
          {centsToEurosInput(selected.rates.session2hCents)}€ · 2 sess.{" "}
          {centsToEurosInput(selected.rates.twoSessionsSameDayCents)}€
        </Typography>
      ) : null}
      <Button
        variant="outlined"
        size="small"
        disabled={disabled || !selected}
        onClick={() => {
          if (!selected) return;
          onApplied({
            catalogPricingId: selected.id,
            rates: selected.rates,
          });
        }}
        sx={{ alignSelf: "flex-start" }}
      >
        Appliquer cette grille
      </Button>
    </Stack>
  );
}
