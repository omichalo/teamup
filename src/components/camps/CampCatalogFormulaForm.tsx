"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  FormLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  CAMP_PRICING_MODE_LABELS,
  CAMP_PRICING_MODES,
  type CampPricingMode,
} from "@/lib/camps/constants";
import type { CampCatalogSite, CampSessionTemplate } from "@/lib/camps/types";
import { CampSiteScheduleEditor } from "./CampSiteScheduleEditor";

type Props = {
  mode: "create" | "edit";
  sites: CampCatalogSite[];
  initial: {
    label: string;
    pricingMode: CampPricingMode;
    sessions: CampSessionTemplate[];
    catalogSiteIds: string[];
  };
  disabled?: boolean | undefined;
  onCancel: () => void;
  onSubmit: (data: {
    label: string;
    pricingMode: CampPricingMode;
    sessions: CampSessionTemplate[];
    catalogSiteIds: string[];
  }) => void;
};

export function CampCatalogFormulaForm({
  mode,
  sites,
  initial,
  disabled = false,
  onCancel,
  onSubmit,
}: Props) {
  const [label, setLabel] = useState(initial.label);
  const [pricingMode, setPricingMode] = useState<CampPricingMode>(
    initial.pricingMode
  );
  const [sessions, setSessions] = useState<CampSessionTemplate[]>(
    initial.sessions
  );
  const [catalogSiteIds, setCatalogSiteIds] = useState<string[]>(
    initial.catalogSiteIds
  );
  const [error, setError] = useState<string | null>(null);

  function toggleSite(siteId: string) {
    setCatalogSiteIds((prev) =>
      prev.includes(siteId)
        ? prev.filter((id) => id !== siteId)
        : [...prev, siteId]
    );
  }

  function handleSubmit() {
    setError(null);
    const trimmed = label.trim();
    if (!trimmed) {
      setError("Indiquez le nom de la formule.");
      return;
    }
    if (sessions.length === 0) {
      setError("Ajoutez au moins un horaire.");
      return;
    }
    for (const session of sessions) {
      if (!session.label.trim()) {
        setError("Chaque horaire doit avoir un libellé.");
        return;
      }
      if (session.endMinutes <= session.startMinutes) {
        setError(`Horaire « ${session.label} » : fin après le début.`);
        return;
      }
    }
    onSubmit({
      label: trimmed,
      pricingMode,
      sessions: sessions.map((s) => ({
        label: s.label.trim(),
        startMinutes: s.startMinutes,
        endMinutes: s.endMinutes,
      })),
      catalogSiteIds,
    });
  }

  const activeSites = sites.filter((s) => s.active);

  return (
    <Stack
      spacing={1.5}
      sx={{
        p: 2,
        borderRadius: 1,
        border: "1px dashed",
        borderColor: "primary.main",
        bgcolor: "action.hover",
      }}
    >
      <Typography variant="subtitle2" fontWeight={700}>
        {mode === "create" ? "Nouvelle formule" : "Modifier la formule"}
      </Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <TextField
          label="Nom"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="ex. Sessions 2h — journée"
          size="small"
          fullWidth
          autoFocus
          disabled={disabled}
        />
        <TextField
          select
          label="Mode de tarification"
          value={pricingMode}
          onChange={(e) => setPricingMode(e.target.value as CampPricingMode)}
          size="small"
          sx={{ minWidth: { sm: 200 } }}
          disabled={disabled}
        >
          {CAMP_PRICING_MODES.map((modeId) => (
            <MenuItem key={modeId} value={modeId}>
              {CAMP_PRICING_MODE_LABELS[modeId]}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <FormControl component="fieldset" variant="standard" disabled={disabled}>
        <FormLabel component="legend">Sites concernés</FormLabel>
        <FormHelperText sx={{ mx: 0, mb: 0.5 }}>
          Aucune sélection = proposée sous tous les sites à l’assignation.
        </FormHelperText>
        {activeSites.length === 0 ? (
          <Alert severity="info" sx={{ mt: 0.5 }}>
            Créez d’abord des sites dans l’onglet Sites.
          </Alert>
        ) : (
          <FormGroup>
            {activeSites.map((site) => (
              <FormControlLabel
                key={site.id}
                control={
                  <Checkbox
                    size="small"
                    checked={catalogSiteIds.includes(site.id)}
                    onChange={() => toggleSite(site.id)}
                  />
                }
                label={site.label}
              />
            ))}
          </FormGroup>
        )}
      </FormControl>

      <CampSiteScheduleEditor
        title={label.trim() || "Formule"}
        sessions={sessions}
        disabled={disabled}
        onChange={setSessions}
      />
      <Stack direction="row" spacing={1}>
        <Button size="small" onClick={onCancel} disabled={disabled}>
          Annuler
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={handleSubmit}
          disabled={disabled}
        >
          {mode === "create" ? "Créer" : "Enregistrer"}
        </Button>
      </Stack>
    </Stack>
  );
}
