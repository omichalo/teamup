"use client";

import type { ConfigEditorDragHandleProps } from "./ConfigEditorLayout";
import {
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
} from "@mui/material";
import type { RegistrationSiteSlot } from "@/lib/club-registration-config/types";
import {
  ISO_WEEKDAY_LABELS,
  formatMinutesAsInput,
  isIsoWeekday,
  parseTimeInput,
  type IsoWeekday,
} from "@/lib/club-registration-config/slot-schedule";
import { ConfigEditorCollapsibleItem, ConfigEditorOptionPanel } from "./ConfigEditorLayout";
import { ConfigEditorRemoveAction } from "./ConfigEditorRemoveAction";
import { slotItemDecor } from "./config-editor-item-decor";
import { slotSummaryMeta } from "./config-editor-summary-meta";
import { configEditorSwitchLabelSx } from "./config-editor-layout";

type Props = {
  slot: RegistrationSiteSlot;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onChange: (patch: Partial<RegistrationSiteSlot>) => void;
  onRemove: () => void;
  onSchoolPickupChange: (enabled: boolean, schoolName?: string) => void;
  dragHandleProps?: ConfigEditorDragHandleProps | null | undefined;
  isDragging?: boolean;
};

const WEEKDAY_OPTIONS: IsoWeekday[] = [1, 2, 3, 4, 5, 6, 7];

export function SiteSlotEditorCard({
  slot,
  expanded,
  onExpandedChange,
  onChange,
  onRemove,
  onSchoolPickupChange,
  dragHandleProps,
  isDragging = false,
}: Props) {
  const schoolPickupEnabled = Boolean(slot.schoolPickupSchool);
  const weekday = isIsoWeekday(slot.weekday) ? slot.weekday : 1;
  const startInput = formatMinutesAsInput(slot.startMinutes ?? 17 * 60);
  const endInput = formatMinutesAsInput(slot.endMinutes ?? 18 * 60 + 30);

  return (
    <ConfigEditorCollapsibleItem
      nested
      expanded={expanded}
      onExpandedChange={onExpandedChange}
      title={slot.label}
      itemLabel={slot.label}
      meta={slotSummaryMeta(slot)}
      decor={slotItemDecor(slot)}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
      removeButton={
        <ConfigEditorRemoveAction label="Supprimer le créneau" onClick={onRemove} />
      }
    >
      <TextField
        label="Libellé affiché aux familles"
        size="small"
        value={slot.label}
        onChange={(e) => onChange({ label: e.target.value })}
        helperText="Ex. Lundi / 17h00 – 18h30 / Jeunes Loisirs"
        fullWidth
      />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id={`slot-weekday-${slot.id}`}>Jour</InputLabel>
          <Select
            labelId={`slot-weekday-${slot.id}`}
            label="Jour"
            value={weekday}
            onChange={(e) => onChange({ weekday: Number(e.target.value) as IsoWeekday })}
          >
            {WEEKDAY_OPTIONS.map((value) => (
              <MenuItem key={value} value={value}>
                {ISO_WEEKDAY_LABELS[value]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Début"
          type="time"
          size="small"
          value={startInput}
          onChange={(e) => {
            const minutes = parseTimeInput(e.target.value);
            if (minutes != null) onChange({ startMinutes: minutes });
          }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="Fin"
          type="time"
          size="small"
          value={endInput}
          onChange={(e) => {
            const minutes = parseTimeInput(e.target.value);
            if (minutes != null) onChange({ endMinutes: minutes });
          }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Stack>

      <ConfigEditorOptionPanel title="Récupération scolaire">
        <FormControlLabel
          sx={configEditorSwitchLabelSx}
          control={
            <Switch
              checked={schoolPickupEnabled}
              onChange={(e) =>
                onSchoolPickupChange(
                  e.target.checked,
                  e.target.checked ? slot.schoolPickupSchool ?? "École" : undefined
                )
              }
            />
          }
          label="Proposer la récupération à la sortie de l'école pour ce créneau"
        />
        {schoolPickupEnabled ? (
          <TextField
            label="Nom de l'école"
            size="small"
            value={slot.schoolPickupSchool ?? ""}
            onChange={(e) => onSchoolPickupChange(true, e.target.value)}
            fullWidth
            sx={{ mt: 1 }}
          />
        ) : null}
      </ConfigEditorOptionPanel>

      <FormControlLabel
        sx={configEditorSwitchLabelSx}
        control={
          <Switch
            checked={slot.enabled}
            onChange={(e) => onChange({ enabled: e.target.checked })}
          />
        }
        label="Créneau visible dans le formulaire"
      />
    </ConfigEditorCollapsibleItem>
  );
}
