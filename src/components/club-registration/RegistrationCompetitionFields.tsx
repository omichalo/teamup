"use client";

import {
  Checkbox,
  FormControlLabel,
  Grid,
  MenuItem,
  TextField,
} from "@mui/material";
import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import { RegistrationMultiSelectField } from "./RegistrationMultiSelectField";

export type CompetitionFormSlice = {
  wantsCompetitorExtras: boolean;
  competitionJerseySize: string;
  wantsOptionalJersey: boolean;
  optionalJerseySize: string;
  competitionIds: string[];
};

type Props = {
  config: RegistrationConfigV1;
  form: CompetitionFormSlice;
  jerseySizes: string[];
  competitionOptions: RegistrationConfigV1["competitions"];
  onFieldChange: (
    field: keyof CompetitionFormSlice,
    value: CompetitionFormSlice[keyof CompetitionFormSlice]
  ) => void;
};

export function RegistrationCompetitionFields({
  config,
  form,
  jerseySizes,
  competitionOptions,
  onFieldChange,
}: Props) {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={form.wantsCompetitorExtras}
              onChange={(e) => {
                const checked = e.target.checked;
                onFieldChange("wantsCompetitorExtras", checked);
                if (checked) {
                  onFieldChange("wantsOptionalJersey", false);
                  onFieldChange("optionalJerseySize", "");
                }
              }}
            />
          }
          label="Options compétiteur"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          select
          label="Taille maillot compétition"
          value={form.competitionJerseySize}
          onChange={(e) => onFieldChange("competitionJerseySize", e.target.value)}
          fullWidth
        >
          <MenuItem value="">Non renseignée</MenuItem>
          {jerseySizes.map((size) => (
            <MenuItem key={size} value={size}>
              {size}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      {!form.wantsCompetitorExtras ? (
        <>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.wantsOptionalJersey}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    onFieldChange("wantsOptionalJersey", checked);
                    if (!checked) {
                      onFieldChange("optionalJerseySize", "");
                    }
                  }}
                />
              }
              label={`Maillot optionnel (${(config.jersey.optionalPriceCents / 100).toFixed(0)} €)`}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              select
              label="Taille maillot optionnel"
              value={form.optionalJerseySize}
              onChange={(e) => onFieldChange("optionalJerseySize", e.target.value)}
              fullWidth
              disabled={!form.wantsOptionalJersey}
            >
              <MenuItem value="">Non renseignée</MenuItem>
              {jerseySizes.map((size) => (
                <MenuItem key={size} value={size}>
                  {size}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </>
      ) : null}
      <Grid size={{ xs: 12 }}>
        <RegistrationMultiSelectField
          label="Compétitions demandées"
          value={form.competitionIds}
          options={competitionOptions.map((competition) => ({
            value: competition.id,
            label: competition.formLabel,
          }))}
          onChange={(value) => onFieldChange("competitionIds", value)}
        />
      </Grid>
    </Grid>
  );
}
