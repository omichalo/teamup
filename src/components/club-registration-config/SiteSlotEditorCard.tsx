"use client";

import type { ConfigEditorDragHandleProps } from "./ConfigEditorLayout";
import {
  FormControlLabel,
  Switch,
  TextField,
} from "@mui/material";
import type { RegistrationSiteSlot } from "@/lib/club-registration-config/types";
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
