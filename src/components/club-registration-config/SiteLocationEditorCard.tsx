"use client";

import type { ConfigEditorDragHandleProps } from "./ConfigEditorLayout";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Add, ExpandMore } from "@mui/icons-material";
import type { RegistrationSite, RegistrationSiteSlot } from "@/lib/club-registration-config/types";
import { moveBySortOrder, nextSortOrder } from "@/lib/club-registration-config/sort-order";
import { RegistrationMultiSelectField } from "@/components/club-registration/RegistrationMultiSelectField";
import { generateConfigItemId } from "./config-editor-utils";
import { ConfigEditorListHeader } from "./ConfigEditorLayout";
import { ConfigEditorRemoveAction } from "./ConfigEditorRemoveAction";
import { siteItemDecor } from "./config-editor-item-decor";
import { SiteSlotEditorCard } from "./SiteSlotEditorCard";
import type { ConfigEditorExpansion } from "./useConfigEditorExpansion";
import { useConfigEditorNativeSortable } from "./useConfigEditorNativeSortable";
import {
  configEditorAccordionDetailsSx,
  configEditorAccordionSummarySx,
  configEditorCollapsibleAccordionSx,
  configEditorCollapsibleShellSx,
  configEditorRemoveFooterSx,
  configEditorSubsectionTitleSx,
} from "./config-editor-layout";

type SectionOption = { value: string; label: string };

type Props = {
  site: RegistrationSite;
  sectionOptions: SectionOption[];
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  slotExpansion: ConfigEditorExpansion;
  dragHandleProps?: ConfigEditorDragHandleProps | null | undefined;
  isDragging?: boolean;
  onUpdateSite: (patch: Partial<RegistrationSite>) => void;
  onRemoveSite: () => void;
  onUpdateSlot: (slotId: string, patch: Partial<RegistrationSiteSlot>) => void;
  onRemoveSlot: (slotId: string) => void;
  onSchoolPickupChange: (slotId: string, enabled: boolean, schoolName?: string) => void;
  onMoveSlot: (fromIndex: number, toIndex: number) => void;
  onAddSlot: () => void;
};

function activeSlotCount(site: RegistrationSite): number {
  return site.slots.filter((slot) => slot.enabled).length;
}

function siteSummaryMeta(
  site: RegistrationSite,
  linkedLabels: string[],
  extraSections: number
): string {
  const active = activeSlotCount(site);
  const parts = [
    `${site.slots.length} créneau${site.slots.length > 1 ? "x" : ""}`,
    `${active} actif${active > 1 ? "s" : ""}`,
  ];
  const gym = site.gymnasiumName?.trim();
  if (gym) {
    parts.unshift(gym);
  }
  if (linkedLabels.length > 0) {
    const sections = linkedLabels.join(", ");
    parts.push(extraSections > 0 ? `${sections} +${extraSections}` : sections);
  }
  return parts.join(" · ");
}

export function SiteLocationEditorCard({
  site,
  sectionOptions,
  expanded,
  onExpandedChange,
  slotExpansion,
  dragHandleProps,
  isDragging = false,
  onUpdateSite,
  onRemoveSite,
  onUpdateSlot,
  onRemoveSlot,
  onSchoolPickupChange,
  onMoveSlot,
  onAddSlot,
}: Props) {
  const linkedLabels = site.linkedSectionIds
    .map((id) => sectionOptions.find((option) => option.value === id)?.label ?? id)
    .slice(0, 3);
  const extraSections = Math.max(0, site.linkedSectionIds.length - linkedLabels.length);
  const { accent, Icon } = siteItemDecor;
  const slotSortable = useConfigEditorNativeSortable(onMoveSlot);

  return (
    <Box sx={configEditorCollapsibleShellSx(accent, { isDragging })}>
      <Accordion
        disableGutters
        elevation={0}
        expanded={expanded}
        onChange={(_event, isExpanded) => onExpandedChange(isExpanded)}
        sx={configEditorCollapsibleAccordionSx}
      >
        <AccordionSummary
          component="div"
          expandIcon={<ExpandMore />}
          sx={configEditorAccordionSummarySx}
        >
          <ConfigEditorListHeader
            title={site.label.trim() || "Sans nom"}
            meta={siteSummaryMeta(site, linkedLabels, extraSections)}
            dragHandleProps={dragHandleProps}
            itemLabel={site.label}
            accent={accent}
            leadingIcon={<Icon fontSize="inherit" aria-hidden />}
          />
        </AccordionSummary>

        <AccordionDetails sx={configEditorAccordionDetailsSx}>
          <Stack spacing={3}>
            <Stack spacing={1.5}>
              <Typography sx={configEditorSubsectionTitleSx}>Informations du lieu</Typography>
              <TextField
                label="Nom du lieu"
                size="small"
                value={site.label}
                onChange={(e) => onUpdateSite({ label: e.target.value })}
                helperText="Commune ou libellé court (ex. Villepreux)"
                fullWidth
              />
              <TextField
                label="Nom du gymnase"
                size="small"
                value={site.gymnasiumName ?? ""}
                onChange={(e) => onUpdateSite({ gymnasiumName: e.target.value })}
                helperText="Affiché sous le lieu lors du choix des créneaux (laisser vide pour masquer)"
                fullWidth
              />
              <RegistrationMultiSelectField
                label="Sections autorisées sur ce lieu"
                value={site.linkedSectionIds}
                options={sectionOptions}
                onChange={(linkedSectionIds) => onUpdateSite({ linkedSectionIds })}
              />
            </Stack>

            <Divider />

            <Stack spacing={2}>
              <Typography sx={configEditorSubsectionTitleSx}>
                Créneaux horaires ({site.slots.length})
              </Typography>

              {site.slots.length === 0 ? (
                <Box
                  sx={{
                    py: 2,
                    px: 2,
                    borderRadius: 1.5,
                    border: 1,
                    borderStyle: "dashed",
                    borderColor: "divider",
                    bgcolor: "action.hover",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Aucun créneau pour ce lieu. Ajoutez au moins un créneau pour qu&apos;il apparaisse
                    dans le formulaire.
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={1}>
                  {site.slots.map((slot, slotIndex) => (
                    <Box key={slot.id} {...slotSortable.getDropTargetProps(slotIndex)}>
                      <SiteSlotEditorCard
                        slot={slot}
                        expanded={slotExpansion.isExpanded(slot.id)}
                        onExpandedChange={(open) => slotExpansion.setExpanded(slot.id, open)}
                        onChange={(patch) => onUpdateSlot(slot.id, patch)}
                        onRemove={() => onRemoveSlot(slot.id)}
                        onSchoolPickupChange={(enabled, schoolName) =>
                          onSchoolPickupChange(slot.id, enabled, schoolName)
                        }
                        dragHandleProps={slotSortable.getDragHandleProps(slotIndex)}
                        isDragging={slotSortable.isDragging(slotIndex)}
                      />
                    </Box>
                  ))}
                </Stack>
              )}

              <Button
                size="small"
                variant="outlined"
                startIcon={<Add />}
                onClick={onAddSlot}
                sx={{ alignSelf: "flex-start" }}
              >
                Ajouter un créneau
              </Button>
            </Stack>
            <Box sx={configEditorRemoveFooterSx}>
              <ConfigEditorRemoveAction label="Supprimer le lieu" onClick={onRemoveSite} />
            </Box>
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}

export function createEmptySlot(existingSlots: RegistrationSiteSlot[]) {
  return {
    id: generateConfigItemId("slot"),
    label: "Nouveau créneau",
    enabled: true,
    sortOrder: nextSortOrder(existingSlots),
  };
}

export function moveSiteSlots(
  slots: RegistrationSiteSlot[],
  fromIndex: number,
  toIndex: number
): RegistrationSiteSlot[] {
  return moveBySortOrder(slots, fromIndex, toIndex);
}
