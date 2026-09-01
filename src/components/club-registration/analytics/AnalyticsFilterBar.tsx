"use client";

import {
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  type SelectChangeEvent,
} from "@mui/material";
import { MANAGED_LIST_STATUS_FILTER_OPTIONS } from "@/lib/club-registration/registration-status";
import type { AnalyticsFilterChange, AnalyticsFilters } from "@/lib/club-registration/analytics/types";

type AnalyticsFilterBarProps = {
  filters: AnalyticsFilters;
  sectionLabels: Record<string, string>;
  onChange: (change: AnalyticsFilterChange) => void;
  onReset: () => void;
};

export function AnalyticsFilterBar({
  filters,
  sectionLabels,
  onChange,
  onReset,
}: AnalyticsFilterBarProps) {
  const handleStatus = (event: SelectChangeEvent) => {
    onChange({ type: "status", value: event.target.value as AnalyticsFilters["status"] });
  };

  const handleSection = (event: SelectChangeEvent) => {
    const value = event.target.value;
    onChange({ type: "mainSectionId", value: value === "" ? null : value });
  };

  const handleSex = (event: SelectChangeEvent) => {
    const value = event.target.value;
    onChange({
      type: "sex",
      value: value === "" ? null : (value as NonNullable<AnalyticsFilters["sex"]>),
    });
  };

  const handleRenewal = (event: SelectChangeEvent) => {
    const value = event.target.value;
    onChange({
      type: "wasSqyMemberLastYear",
      value: value === "" ? null : (value as NonNullable<AnalyticsFilters["wasSqyMemberLastYear"]>),
    });
  };

  const hasSecondaryFilters =
    Boolean(filters.mainSectionId) ||
    Boolean(filters.sex) ||
    Boolean(filters.wasSqyMemberLastYear);

  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={2} useFlexGap flexWrap="wrap">
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="analytics-status-label">Statut dossier</InputLabel>
        <Select
          labelId="analytics-status-label"
          label="Statut dossier"
          value={filters.status}
          onChange={handleStatus}
        >
          {MANAGED_LIST_STATUS_FILTER_OPTIONS.filter((opt) => opt.value !== "actionable").map(
            (opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            )
          )}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel id="analytics-section-label">Section</InputLabel>
        <Select
          labelId="analytics-section-label"
          label="Section"
          value={filters.mainSectionId ?? ""}
          onChange={handleSection}
        >
          <MenuItem value="">Toutes</MenuItem>
          {Object.entries(sectionLabels).map(([id, label]) => (
            <MenuItem key={id} value={id}>
              {label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel id="analytics-sex-label">Sexe</InputLabel>
        <Select labelId="analytics-sex-label" label="Sexe" value={filters.sex ?? ""} onChange={handleSex}>
          <MenuItem value="">Tous</MenuItem>
          <MenuItem value="female">Femme</MenuItem>
          <MenuItem value="male">Homme</MenuItem>
          <MenuItem value="other">Autre</MenuItem>
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="analytics-renewal-label">Adhésion</InputLabel>
        <Select
          labelId="analytics-renewal-label"
          label="Adhésion"
          value={filters.wasSqyMemberLastYear ?? ""}
          onChange={handleRenewal}
        >
          <MenuItem value="">Tous</MenuItem>
          <MenuItem value="renewal">Renouvellement</MenuItem>
          <MenuItem value="new">Nouveau</MenuItem>
        </Select>
      </FormControl>

      {hasSecondaryFilters ? (
        <Button size="small" variant="text" onClick={onReset} sx={{ alignSelf: "center" }}>
          Réinitialiser filtres
        </Button>
      ) : null}
    </Stack>
  );
}
