"use client";

import { Box, ListItemText, MenuItem, Stack, TextField, Typography, useTheme } from "@mui/material";
import type { Theme } from "@mui/material/styles";
import type { PricingProfileDefinition } from "@/lib/club-registration-config/types";
import {
  CONFIG_EDITOR_ACCENT_LABELS,
  CONFIG_EDITOR_ACCENTS,
  type ConfigEditorAccent,
} from "@/lib/club-registration-config/config-editor-accents";
import {
  CONFIG_EDITOR_ICON_KEYS,
  CONFIG_EDITOR_ICON_LABELS,
  resolveConfigEditorIcon,
} from "./config-editor-icons";

export const PRICING_PROFILE_BEHAVIOR_OPTIONS: Array<{
  value: PricingProfileDefinition["behavior"];
  label: string;
  summary: string;
  detail: string;
}> = [
  {
    value: "classic_like",
    label: "Classique / école",
    summary: "Âge + option « section compétiteur »",
    detail:
      "Le tarif dépend de la date de naissance (tranche d'âge), du profil tarifaire choisi sur la section, et de la case « section compétiteur ». Correspond aux lignes de la grille Tarifs avec ce profil + tranche + compétiteur oui/non.",
  },
  {
    value: "handisport",
    label: "Handisport",
    summary: "Loisir ou compétition handisport (pas la section compétiteur classique)",
    detail:
      "Le formulaire demande « loisir » ou « compétition handisport ». En compétition, l'âge détermine la tranche. La case « section compétiteur » classique est masquée. Grille Tarifs : lignes avec ce profil + loisir/compétition (+ tranche si compétition).",
  },
  {
    value: "sport_adapte",
    label: "Sport adapté",
    summary: "Tranches dédiées + logique compétiteur adaptée",
    detail:
      "Comme le classique sur l'âge et la case compétiteur, mais avec des tranches d'âge propres (profil d'âge sport adapté) et sans la section compétiteur classique. Grille Tarifs : profil sport adapté + tranche + compétiteur oui/non.",
  },
];

function accentColor(theme: Theme, accent: ConfigEditorAccent): string {
  return theme.palette[accent].main;
}

export function ConfigEditorAccentSwatch({
  accent,
  size = 14,
}: {
  accent: ConfigEditorAccent;
  size?: number;
}) {
  const theme = useTheme();
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        bgcolor: accentColor(theme, accent),
        border: 1,
        borderColor: "divider",
        boxShadow: 1,
      }}
    />
  );
}

type AccentFieldProps = {
  value: ConfigEditorAccent;
  onChange: (accent: ConfigEditorAccent) => void;
};

export function PricingProfileAccentField({ value, onChange }: AccentFieldProps) {
  return (
    <TextField
      select
      label="Couleur"
      size="small"
      value={value}
      onChange={(e) => onChange(e.target.value as ConfigEditorAccent)}
      SelectProps={{
        renderValue: (selected) => {
          const accent = selected as ConfigEditorAccent;
          return (
            <Stack direction="row" spacing={1} alignItems="center">
              <ConfigEditorAccentSwatch accent={accent} />
              <span>{CONFIG_EDITOR_ACCENT_LABELS[accent]}</span>
            </Stack>
          );
        },
      }}
      sx={{ flex: 1 }}
    >
      {CONFIG_EDITOR_ACCENTS.map((accent) => (
        <MenuItem key={accent} value={accent}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <ConfigEditorAccentSwatch accent={accent} />
            <Typography variant="body2">{CONFIG_EDITOR_ACCENT_LABELS[accent]}</Typography>
          </Stack>
        </MenuItem>
      ))}
    </TextField>
  );
}

type IconFieldProps = {
  value: string;
  onChange: (iconKey: string) => void;
};

export function PricingProfileIconField({ value, onChange }: IconFieldProps) {
  return (
    <TextField
      select
      label="Icône"
      size="small"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      SelectProps={{
        renderValue: (selected) => {
          const key = String(selected);
          const Icon = resolveConfigEditorIcon(key);
          return (
            <Stack direction="row" spacing={1} alignItems="center">
              <Icon fontSize="small" color="action" />
              <span>{CONFIG_EDITOR_ICON_LABELS[key as keyof typeof CONFIG_EDITOR_ICON_LABELS] ?? key}</span>
            </Stack>
          );
        },
      }}
      sx={{ flex: 1 }}
    >
      {CONFIG_EDITOR_ICON_KEYS.map((key) => {
        const Icon = resolveConfigEditorIcon(key);
        return (
          <MenuItem key={key} value={key}>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Icon fontSize="small" color="action" />
              <Typography variant="body2">{CONFIG_EDITOR_ICON_LABELS[key]}</Typography>
            </Stack>
          </MenuItem>
        );
      })}
    </TextField>
  );
}

type BehaviorFieldProps = {
  value: PricingProfileDefinition["behavior"];
  disabled?: boolean;
  onChange: (behavior: PricingProfileDefinition["behavior"]) => void;
};

export function PricingProfileBehaviorField({
  value,
  disabled = false,
  onChange,
}: BehaviorFieldProps) {
  const selected = PRICING_PROFILE_BEHAVIOR_OPTIONS.find((option) => option.value === value);

  return (
    <TextField
      select
      label="Logique de calcul"
      size="small"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as PricingProfileDefinition["behavior"])}
      helperText={selected?.detail}
      SelectProps={{
        renderValue: (selectedValue) => {
          const option = PRICING_PROFILE_BEHAVIOR_OPTIONS.find((o) => o.value === selectedValue);
          return option?.label ?? String(selectedValue);
        },
      }}
      fullWidth
    >
      {PRICING_PROFILE_BEHAVIOR_OPTIONS.map((option) => (
        <MenuItem key={option.value} value={option.value} sx={{ whiteSpace: "normal", py: 1.25 }}>
          <ListItemText
            primary={option.label}
            secondary={option.summary}
            primaryTypographyProps={{ fontWeight: 600 }}
            secondaryTypographyProps={{ variant: "caption", display: "block", mt: 0.25 }}
          />
        </MenuItem>
      ))}
    </TextField>
  );
}

export function pricingProfileSummaryMeta(def: PricingProfileDefinition): string {
  const behavior =
    PRICING_PROFILE_BEHAVIOR_OPTIONS.find((option) => option.value === def.behavior)?.label ??
    def.behavior;
  return `${behavior}${def.builtIn ? " · Fourni par défaut" : ""}`;
}
