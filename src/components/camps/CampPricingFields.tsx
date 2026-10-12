"use client";

import { Stack, TextField } from "@mui/material";
import type { CampPricingEurosDraft } from "./camp-pricing-draft";

type Props = {
  pricing: CampPricingEurosDraft;
  disabled?: boolean | undefined;
  onChange: (key: keyof CampPricingEurosDraft, value: string) => void;
};

export function CampPricingFields({ pricing, disabled = false, onChange }: Props) {
  return (
    <Stack spacing={2} sx={{ maxWidth: 720 }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          label="Adhérent / jour"
          value={pricing.memberDay}
          onChange={(e) => onChange("memberDay", e.target.value)}
          inputMode="decimal"
          fullWidth
          size="small"
          disabled={disabled}
        />
        <TextField
          label="Adhérent / semaine"
          value={pricing.memberWeek}
          onChange={(e) => onChange("memberWeek", e.target.value)}
          inputMode="decimal"
          fullWidth
          size="small"
          disabled={disabled}
        />
      </Stack>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          label="Non-adhérent / jour"
          value={pricing.nonMemberDay}
          onChange={(e) => onChange("nonMemberDay", e.target.value)}
          inputMode="decimal"
          fullWidth
          size="small"
          disabled={disabled}
        />
        <TextField
          label="Non-adhérent / semaine"
          value={pricing.nonMemberWeek}
          onChange={(e) => onChange("nonMemberWeek", e.target.value)}
          inputMode="decimal"
          fullWidth
          size="small"
          disabled={disabled}
        />
      </Stack>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          label="Session 2h"
          value={pricing.session2h}
          onChange={(e) => onChange("session2h", e.target.value)}
          inputMode="decimal"
          fullWidth
          size="small"
          disabled={disabled}
        />
        <TextField
          label="2 sessions même jour"
          value={pricing.twoSessionsSameDay}
          onChange={(e) => onChange("twoSessionsSameDay", e.target.value)}
          inputMode="decimal"
          fullWidth
          size="small"
          disabled={disabled}
        />
      </Stack>
    </Stack>
  );
}
