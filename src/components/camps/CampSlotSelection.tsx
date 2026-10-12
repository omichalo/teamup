"use client";

import {
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
} from "@mui/material";
import type { CampPricingMode } from "@/lib/camps/constants";
import type { CampSlot } from "@/lib/camps/types";
import {
  campDaySelectionLabel,
  groupCampSlotsByDate,
  isDayFullySelected,
  toggleDaySlotIds,
} from "@/lib/camps/camp-registration-form-helpers";

type Props = {
  pricingMode: CampPricingMode;
  slots: readonly CampSlot[];
  selectedSlotIds: readonly string[];
  weekPrefillHint: boolean;
  onChange: (nextIds: string[]) => void;
};

export function CampSlotSelection({
  pricingMode,
  slots,
  selectedSlotIds,
  weekPrefillHint,
  onChange,
}: Props) {
  if (pricingMode === "day_week") {
    const days = groupCampSlotsByDate(slots);
    return (
      <FormControl component="fieldset">
        <FormLabel component="legend">
          Journées
          {weekPrefillHint ? " (semaine entière pré-sélectionnée)" : ""}
        </FormLabel>
        <FormGroup>
          {days.map((day) => {
            const checked = isDayFullySelected(selectedSlotIds, day.slotIds);
            return (
              <FormControlLabel
                key={day.date}
                control={
                  <Checkbox
                    checked={checked}
                    onChange={(e) =>
                      onChange(
                        toggleDaySlotIds(
                          selectedSlotIds,
                          day.slotIds,
                          e.target.checked
                        )
                      )
                    }
                  />
                }
                label={campDaySelectionLabel(day)}
              />
            );
          })}
        </FormGroup>
      </FormControl>
    );
  }

  return (
    <FormControl component="fieldset">
      <FormLabel component="legend">
        Créneaux
        {weekPrefillHint ? " (tous pré-sélectionnés)" : ""}
      </FormLabel>
      <FormGroup>
        {slots.map((slot) => (
          <FormControlLabel
            key={slot.id}
            control={
              <Checkbox
                checked={selectedSlotIds.includes(slot.id)}
                onChange={(e) => {
                  onChange(
                    e.target.checked
                      ? [...selectedSlotIds, slot.id]
                      : selectedSlotIds.filter((id) => id !== slot.id)
                  );
                }}
              />
            }
            label={`${slot.date} · ${slot.label}`}
          />
        ))}
      </FormGroup>
    </FormControl>
  );
}
