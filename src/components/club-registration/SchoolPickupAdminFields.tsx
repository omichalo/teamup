"use client";

import type { ComponentType } from "react";
import { Grid } from "@mui/material";

type Option = { value: string; label: string };

type Props = {
  slotIds: string[];
  schoolPickupSlotIds: string[];
  /** Créneaux éligibles au dispositif école (config Firestore active). */
  eligibleSchoolPickupSlotIds: ReadonlySet<string>;
  /** Créneaux virtuels « inscription libre » (exclusifs). */
  openEnrollmentSlotIds?: ReadonlySet<string>;
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

function normalizeSlotIdsWithOpenEnrollment(
  next: string[],
  previous: string[],
  openEnrollmentSlotIds: ReadonlySet<string>
): string[] {
  if (openEnrollmentSlotIds.size === 0) {
    return next;
  }
  const addedOpen = next.find(
    (id) => openEnrollmentSlotIds.has(id) && !previous.includes(id)
  );
  if (addedOpen) {
    return [addedOpen];
  }
  if (next.some((id) => openEnrollmentSlotIds.has(id)) && next.length > 1) {
    return next.filter((id) => !openEnrollmentSlotIds.has(id));
  }
  return next;
}

export function SchoolPickupAdminFields({
  slotIds,
  schoolPickupSlotIds,
  eligibleSchoolPickupSlotIds,
  openEnrollmentSlotIds,
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
            const normalized = normalizeSlotIdsWithOpenEnrollment(
              value,
              slotIds,
              openEnrollmentSlotIds ?? new Set()
            );
            onSlotIdsChange(normalized);
            onSchoolPickupSlotIdsChange(
              schoolPickupSlotIds.filter((id) => normalized.includes(id))
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
