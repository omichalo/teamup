"use client";

import {
  Checkbox,
  Collapse,
  FormControlLabel,
  FormGroup,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import {
  getCheckboxAidRules,
  getToggleAidRules,
  isToggleAidWithReferenceCode,
} from "@/lib/club-registration-config/aid-rules";
import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import {
  getReductionReferenceCode,
  reductionReferenceCodeFieldKey,
  setReductionReferenceCode,
} from "@/lib/club-registration/reduction-reference-codes";
import type { RegistrationDraft } from "./registration-defaults";

type Props = {
  config: RegistrationConfigV1;
  draft: Pick<RegistrationDraft, "reductionTypes" | "reductionReferenceCodes">;
  onChange: (patch: Partial<RegistrationDraft>) => void;
};

export function AidReductionFields({ config, draft, onChange }: Props) {
  const toggleAidRules = getToggleAidRules(config);
  const checkboxAidRules = getCheckboxAidRules(config);

  const toggleReduction = (id: string, next: boolean) => {
    const set = new Set(draft.reductionTypes);
    if (next) {
      set.add(id);
      onChange({ reductionTypes: Array.from(set) });
      return;
    }
    set.delete(id);
    onChange({
      reductionTypes: Array.from(set),
      reductionReferenceCodes: setReductionReferenceCode(
        draft.reductionReferenceCodes,
        id,
        ""
      ),
    });
  };

  const toggleReductionCheckbox = (id: string) => {
    const set = new Set(draft.reductionTypes);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onChange({ reductionTypes: Array.from(set) });
  };

  const updateReferenceCode = (aidId: string, value: string) => {
    onChange({
      reductionReferenceCodes: setReductionReferenceCode(
        draft.reductionReferenceCodes,
        aidId,
        value
      ),
    });
  };

  return (
    <>
      {toggleAidRules.map((rule) => {
        if (!isToggleAidWithReferenceCode(rule)) return null;
        const selected = draft.reductionTypes.includes(rule.id);
        return (
          <Stack key={rule.id} spacing={1}>
            <FormControlLabel
              control={
                <Switch
                  checked={selected}
                  onChange={(e) => toggleReduction(rule.id, e.target.checked)}
                />
              }
              label={rule.form.toggleLabel}
            />
            <Collapse in={selected} timeout={{ enter: 300, exit: 200 }}>
              <TextField
                label={rule.form.referenceCode.label}
                value={getReductionReferenceCode(draft.reductionReferenceCodes, rule.id)}
                onChange={(e) => updateReferenceCode(rule.id, e.target.value)}
                fullWidth
                inputProps={{
                  "data-field": reductionReferenceCodeFieldKey(rule.id),
                  maxLength: rule.form.referenceCode.maxLength ?? 80,
                }}
                helperText={rule.form.referenceCode.helperText}
              />
            </Collapse>
          </Stack>
        );
      })}

      {checkboxAidRules.length > 0 ? (
        <Stack spacing={0.5}>
          <Typography variant="subtitle2" data-field="reductionTypes" tabIndex={-1}>
            {toggleAidRules.length > 0 ? "Autres aides et réductions" : "Aides et réductions"}
          </Typography>
          <FormGroup>
            {checkboxAidRules.map((rule) => (
              <FormControlLabel
                key={rule.id}
                control={
                  <Checkbox
                    checked={draft.reductionTypes.includes(rule.id)}
                    onChange={() => toggleReductionCheckbox(rule.id)}
                  />
                }
                label={rule.label}
              />
            ))}
          </FormGroup>
        </Stack>
      ) : null}
    </>
  );
}
