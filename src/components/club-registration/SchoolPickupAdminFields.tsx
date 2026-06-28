"use client";

import type { ComponentType } from "react";
import { Grid } from "@mui/material";

type Option = { value: string; label: string };

type Props = {
  slotIds: string[];
  schoolPickupSlotIds: string[];
  /** Créneaux éligibles au dispositif école (config Firestore active). */
  eligibleSchoolPickupSlotIds: ReadonlySet<string>;
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
  eligibleSchoolPickupSlotIds,
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
              slotIds.includes(option.value) &&
              eligibleSchoolPickupSlotIds.has(option.value)
          )}
          onChange={onSchoolPickupSlotIdsChange}
        />
      </Grid>
    </>
  );
}
