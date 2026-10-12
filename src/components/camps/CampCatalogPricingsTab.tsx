"use client";

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import type { CampCatalogPricing, CampPricingRates } from "@/lib/camps/types";
import {
  centsToEurosInput,
  EMPTY_PRICING_EUROS,
  pricingEurosToCents,
  type CampPricingEurosDraft,
} from "./camp-pricing-draft";
import { CampPricingFields } from "./CampPricingFields";

function ratesToDraft(rates: CampPricingRates): CampPricingEurosDraft {
  return {
    memberDay: centsToEurosInput(rates.memberDayCents),
    memberWeek: centsToEurosInput(rates.memberWeekCents),
    nonMemberDay: centsToEurosInput(rates.nonMemberDayCents),
    nonMemberWeek: centsToEurosInput(rates.nonMemberWeekCents),
    session2h: centsToEurosInput(rates.session2hCents),
    twoSessionsSameDay: centsToEurosInput(rates.twoSessionsSameDayCents),
  };
}

function formatRatesSummary(rates: CampPricingRates): string {
  return [
    `Adh. ${centsToEurosInput(rates.memberDayCents)}€/j · ${centsToEurosInput(rates.memberWeekCents)}€/sem`,
    `Non-adh. ${centsToEurosInput(rates.nonMemberDayCents)}€/j · ${centsToEurosInput(rates.nonMemberWeekCents)}€/sem`,
    `Session ${centsToEurosInput(rates.session2hCents)}€ · 2 sess. ${centsToEurosInput(rates.twoSessionsSameDayCents)}€`,
  ].join(" — ");
}

type Props = {
  pricings: CampCatalogPricing[];
  busy: boolean;
  formMode: "create" | "edit" | null;
  editingPricing: CampCatalogPricing | null;
  onStartCreate: () => void;
  onStartEdit: (pricing: CampCatalogPricing) => void;
  onCancelForm: () => void;
  onSubmitForm: (data: { label: string; rates: CampPricingRates }) => void;
  onRemove: (pricingId: string) => void;
};

export function CampCatalogPricingsTab({
  pricings,
  busy,
  formMode,
  editingPricing,
  onStartCreate,
  onStartEdit,
  onCancelForm,
  onSubmitForm,
  onRemove,
}: Props) {
  if (formMode) {
    return (
      <PricingForm
        busy={busy}
        initial={
          formMode === "edit" && editingPricing
            ? {
                label: editingPricing.label,
                pricing: ratesToDraft(editingPricing.rates),
              }
            : { label: "", pricing: { ...EMPTY_PRICING_EUROS } }
        }
        submitLabel={formMode === "edit" ? "Enregistrer" : "Créer"}
        onCancel={onCancelForm}
        onSubmit={onSubmitForm}
      />
    );
  }

  return (
    <Stack spacing={2}>
      <Button
        startIcon={<AddIcon />}
        variant="outlined"
        onClick={onStartCreate}
        disabled={busy}
        sx={{ alignSelf: "flex-start" }}
      >
        Nouvelle grille tarifaire
      </Button>
      {pricings.length === 0 ? (
        <Alert severity="info">Aucune grille tarifaire catalogue.</Alert>
      ) : (
        pricings.map((pricing) => (
          <Stack
            key={pricing.id}
            direction="row"
            spacing={1}
            alignItems="flex-start"
            sx={{
              p: 1.5,
              borderRadius: 1,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography fontWeight={600}>{pricing.label}</Typography>
              <Typography variant="body2" color="text.secondary">
                {formatRatesSummary(pricing.rates)}
              </Typography>
            </Box>
            <IconButton
              size="small"
              aria-label={`Modifier ${pricing.label}`}
              disabled={busy}
              onClick={() => onStartEdit(pricing)}
            >
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              aria-label={`Supprimer ${pricing.label}`}
              disabled={busy}
              onClick={() => onRemove(pricing.id)}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))
      )}
    </Stack>
  );
}

function PricingForm({
  busy,
  initial,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  busy: boolean;
  initial: { label: string; pricing: CampPricingEurosDraft };
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (data: { label: string; rates: CampPricingRates }) => void;
}) {
  const [label, setLabel] = useState(initial.label);
  const [pricing, setPricing] = useState(initial.pricing);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    setError(null);
    const trimmed = label.trim();
    if (!trimmed) {
      setError("Indiquez un nom de grille.");
      return;
    }
    const rates = pricingEurosToCents(pricing);
    if (!rates) {
      setError("Renseignez tous les tarifs (montants ≥ 0 en euros).");
      return;
    }
    onSubmit({ label: trimmed, rates });
  }

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 1,
        border: "1px dashed",
        borderColor: "divider",
      }}
    >
      <Typography fontWeight={700} sx={{ mb: 2 }}>
        {submitLabel === "Créer" ? "Nouvelle grille" : "Modifier la grille"}
      </Typography>
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      <Stack spacing={2}>
        <TextField
          label="Nom"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          size="small"
          fullWidth
          disabled={busy}
        />
        <CampPricingFields
          pricing={pricing}
          disabled={busy}
          onChange={(key, value) => setPricing((p) => ({ ...p, [key]: value }))}
        />
        <Stack direction="row" spacing={1}>
          <Button onClick={onCancel} disabled={busy}>
            Annuler
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={busy}>
            {submitLabel}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
