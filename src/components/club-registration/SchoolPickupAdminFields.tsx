"use client";

import type { ComponentType } from "react";
import { Grid } from "@mui/material";
import { SCHOOL_PICKUP_SLOT_IDS } from "@/lib/club-registration/school-pickup";

type Option = { value: string; label: string };

type Props = {
  slotIds: string[];
  schoolPickupSlotIds: string[];
  allSlotOptions: Option[];
  onSlotIdsChange: (slotIds: string[]) => void;
  onSchoolPickupSlotIdsChange: (schoolPickupSlotIds: string[]) => void;
  MultiSelectField: ComponentType<{
    label: string;
    value: string[];
    options: Option[];
    onChange: (value: string[]) => void;
  }>;
};

export function SchoolPickupAdminFields({
  slotIds,
  schoolPickupSlotIds,
  allSlotOptions,
  onSlotIdsChange,
  onSchoolPickupSlotIdsChange,
  MultiSelectField,
}: Props) {
  return (
    <>
      <Grid size={{ xs: 12 }}>
        <MultiSelectField
          label="Créneaux"
          value={slotIds}
          options={allSlotOptions}
          onChange={(value) => {
            onSlotIdsChange(value);
            onSchoolPickupSlotIdsChange(
              schoolPickupSlotIds.filter((id) => value.includes(id))
            );
          }}
        />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <MultiSelectField
          label="Récupération à la sortie de l’école"
          value={schoolPickupSlotIds.filter((id) => slotIds.includes(id))}
          options={allSlotOptions.filter(
            (option) =>
              slotIds.includes(option.value) && SCHOOL_PICKUP_SLOT_IDS.has(option.value)
          )}
          onChange={onSchoolPickupSlotIdsChange}
        />
      </Grid>
    </>
  );
}
