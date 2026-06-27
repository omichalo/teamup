"use client";

import { Chip, Stack, Typography } from "@mui/material";
import {
  MANAGED_LIST_MEDICAL_CERTIFICATE_FILTER_OPTIONS,
  type ManagedListMedicalCertificateFilter,
} from "@/lib/club-registration/medical-certificate";

type Props = {
  value: ManagedListMedicalCertificateFilter;
  onChange: (value: ManagedListMedicalCertificateFilter) => void;
};

export function ManagedListMedicalCertificateChips({ value, onChange }: Props) {
  const activeHint =
    MANAGED_LIST_MEDICAL_CERTIFICATE_FILTER_OPTIONS.find((option) => option.value === value)
      ?.hint ?? null;

  return (
    <Stack spacing={0.75} sx={{ pt: 0.25 }}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        {MANAGED_LIST_MEDICAL_CERTIFICATE_FILTER_OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <Chip
              key={option.value}
              label={option.label}
              size="small"
              clickable
              color={selected ? "secondary" : "default"}
              variant={selected ? "filled" : "outlined"}
              onClick={() => onChange(option.value)}
            />
          );
        })}
      </Stack>
      {activeHint && value !== "all" ? (
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
          {activeHint}
        </Typography>
      ) : null}
    </Stack>
  );
}
