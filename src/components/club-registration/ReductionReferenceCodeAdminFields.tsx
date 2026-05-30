"use client";

import { Grid, TextField } from "@mui/material";
import { getToggleAidRules } from "@/lib/club-registration-config/aid-rules";
import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import {
  getReductionReferenceCode,
  setReductionReferenceCode,
} from "@/lib/club-registration/reduction-reference-codes";

type Props = {
  config: RegistrationConfigV1;
  reductionTypes: string[];
  reductionReferenceCodes: Record<string, string>;
  onReferenceCodesChange: (codes: Record<string, string>) => void;
};

export function ReductionReferenceCodeAdminFields({
  config,
  reductionTypes,
  reductionReferenceCodes,
  onReferenceCodesChange,
}: Props) {
  const toggleAidRules = getToggleAidRules(config);
  if (toggleAidRules.length === 0) return null;

  return toggleAidRules.map((rule) => (
    <Grid key={rule.id} size={{ xs: 12, sm: 6 }}>
      <TextField
        label={rule.form.referenceCode.label}
        value={getReductionReferenceCode(reductionReferenceCodes, rule.id)}
        onChange={(e) =>
          onReferenceCodesChange(
            setReductionReferenceCode(reductionReferenceCodes, rule.id, e.target.value)
          )
        }
        fullWidth
        helperText={
          reductionTypes.includes(rule.id)
            ? rule.form.referenceCode.helperText
            : "Sélectionnez l'aide correspondante pour enregistrer un code"
        }
        disabled={!reductionTypes.includes(rule.id)}
      />
    </Grid>
  ));
}
