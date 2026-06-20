"use client";

import {
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import type { RegistrationDraft } from "./registration-defaults";

type JerseySize = NonNullable<RegistrationDraft["competitionJerseySize"]>;

type Props = {
  config: RegistrationConfigV1;
  draft: RegistrationDraft;
  onChange: (patch: Partial<RegistrationDraft>) => void;
};

export function PracticeCompetitorJerseyField({ config, draft, onChange }: Props) {
  if (!draft.wantsCompetitorExtras) {
    return null;
  }

  return (
    <FormControl fullWidth required={draft.wantsCompetitorExtras}>
      <InputLabel id="jersey-label">Taille de maillot de compétition</InputLabel>
      <Select
        labelId="jersey-label"
        label="Taille de maillot de compétition"
        name="competitionJerseySize"
        value={draft.competitionJerseySize ?? ""}
        onChange={(e) =>
          onChange({
            competitionJerseySize: e.target.value as JerseySize,
          })
        }
      >
        <MenuItem value="">
          <em>Choisir…</em>
        </MenuItem>
        {config.uiCopy.jerseySizes.map((size) => (
          <MenuItem key={size} value={size}>
            {size}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export function PracticeOptionalJerseySection({ config, draft, onChange }: Props) {
  if (draft.wantsCompetitorExtras) {
    return null;
  }

  return (
    <Stack spacing={2}>
      <FormControlLabel
        data-field="wantsOptionalJersey"
        control={
          <Switch
            checked={draft.wantsOptionalJersey}
            onChange={(e) => {
              const checked = e.target.checked;
              onChange({
                wantsOptionalJersey: checked,
                ...(checked ? {} : { optionalJerseySize: undefined }),
              });
            }}
          />
        }
        label={
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
            <Typography component="span" variant="body2">
              {config.uiCopy.optionalJerseyOptInLabel}
            </Typography>
            <Typography component="span" variant="body2" fontWeight={700} color="primary.main">
              {(config.jersey.optionalPriceCents / 100).toFixed(0)} €
            </Typography>
          </Stack>
        }
      />

      {draft.wantsOptionalJersey ? (
        <FormControl fullWidth required={draft.wantsOptionalJersey}>
          <InputLabel id="optional-jersey-label">Taille de maillot</InputLabel>
          <Select
            labelId="optional-jersey-label"
            label="Taille de maillot"
            name="optionalJerseySize"
            value={draft.optionalJerseySize ?? ""}
            onChange={(e) =>
              onChange({
                optionalJerseySize: e.target.value as JerseySize,
              })
            }
          >
            <MenuItem value="">
              <em>Choisir…</em>
            </MenuItem>
            {config.uiCopy.jerseySizes.map((size) => (
              <MenuItem key={size} value={size}>
                {size}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : null}
    </Stack>
  );
}
