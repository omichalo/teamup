"use client";

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Stack,
  TextField,
} from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import type { AgeBand, AgeBandProfile, RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import { listPricingProfiles } from "@/lib/club-registration-config/pricing-profiles";
import { generateConfigItemId } from "./config-editor-utils";
import {
  ConfigEditorAddButton,
  ConfigEditorCollapsibleItem,
  ConfigEditorListHeader,
} from "./ConfigEditorLayout";
import { ConfigEditorRemoveAction } from "./ConfigEditorRemoveAction";
import { ageBandDecor, ageBandProfileDecor } from "./config-editor-item-decor";
import { ageBandSummaryMeta } from "./config-editor-summary-meta";
import {
  ConfigEditorDraggableItem,
  ConfigEditorSortableList,
} from "./ConfigEditorSortableList";
import {
  configEditorAccordionDetailsSx,
  configEditorAccordionSummarySx,
  configEditorCollapsibleAccordionSx,
  configEditorCollapsibleShellSx,
} from "./config-editor-layout";
import { useConfigEditorExpansion } from "./useConfigEditorExpansion";

type Props = {
  config: RegistrationConfigV1;
  profileId: string;
  profile: AgeBandProfile;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onUpdateProfile: (patch: Partial<AgeBandProfile>) => void;
  onUpdateBand: (bandId: string, patch: Partial<AgeBand>) => void;
  onRemoveBand: (bandId: string) => void;
  onMoveBand: (fromIndex: number, toIndex: number) => void;
};

export function AgeBandProfileEditorCard({
  config,
  profileId,
  profile,
  expanded,
  onExpandedChange,
  onUpdateProfile,
  onUpdateBand,
  onRemoveBand,
  onMoveBand,
}: Props) {
  const bandExpansion = useConfigEditorExpansion();
  const profileKind = listPricingProfiles(config).find((p) => p.id === profileId)?.label ?? profile.label;
  const { accent, Icon } = ageBandProfileDecor(config, profileId);

  const handleAddBand = () => {
    const band = createEmptyAgeBand();
    onUpdateProfile({ bands: [...profile.bands, band] });
    onExpandedChange(true);
    bandExpansion.expandItem(band.id);
  };

  return (
    <Box sx={configEditorCollapsibleShellSx(accent)}>
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
            title={profile.label}
            meta={`${profileKind} · ${profile.bands.length} tranche${profile.bands.length > 1 ? "s" : ""}`}
            accent={accent}
            leadingIcon={<Icon fontSize="inherit" aria-hidden />}
          />
        </AccordionSummary>
        <AccordionDetails sx={configEditorAccordionDetailsSx}>
          <Stack spacing={2}>
            <TextField
              label="Libellé du profil"
              size="small"
              value={profile.label}
              onChange={(e) => onUpdateProfile({ label: e.target.value })}
              fullWidth
            />
            {profile.bands.length > 0 ? (
              <ConfigEditorSortableList
                droppableId={`age-profile-${profileId}-bands`}
                onMove={onMoveBand}
                spacing={1}
              >
                {profile.bands.map((band, bandIndex) => (
                  <ConfigEditorDraggableItem key={band.id} draggableId={band.id} index={bandIndex}>
                    {({ dragHandleProps, isDragging }) => (
                      <ConfigEditorCollapsibleItem
                        nested
                        expanded={bandExpansion.isExpanded(band.id)}
                        onExpandedChange={(open) => bandExpansion.setExpanded(band.id, open)}
                        title={band.label}
                        itemLabel={band.label}
                        meta={ageBandSummaryMeta(band)}
                        decor={ageBandDecor()}
                        dragHandleProps={dragHandleProps}
                        isDragging={isDragging}
                        removeButton={
                          <ConfigEditorRemoveAction
                            label="Supprimer la tranche"
                            onClick={() => onRemoveBand(band.id)}
                          />
                        }
                      >
                        <TextField
                          label="Libellé affiché"
                          size="small"
                          value={band.label}
                          onChange={(e) => onUpdateBand(band.id, { label: e.target.value })}
                          fullWidth
                        />
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                          <TextField
                            label="Âge minimum"
                            size="small"
                            type="number"
                            value={band.minAge}
                            onChange={(e) =>
                              onUpdateBand(band.id, {
                                minAge: Number.parseInt(e.target.value, 10) || 0,
                              })
                            }
                            sx={{ flex: 1 }}
                          />
                          <TextField
                            label="Âge maximum"
                            size="small"
                            type="number"
                            value={band.maxAge ?? ""}
                            onChange={(e) =>
                              onUpdateBand(band.id, {
                                maxAge: e.target.value
                                  ? Number.parseInt(e.target.value, 10)
                                  : undefined,
                              })
                            }
                            helperText="Vide = pas de limite supérieure"
                            sx={{ flex: 1 }}
                          />
                        </Stack>
                      </ConfigEditorCollapsibleItem>
                    )}
                  </ConfigEditorDraggableItem>
                ))}
              </ConfigEditorSortableList>
            ) : null}
            <ConfigEditorAddButton label="Ajouter une tranche" onClick={handleAddBand} />
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}

export function createEmptyAgeBand(): AgeBand {
  return {
    id: generateConfigItemId("band"),
    minAge: 0,
    label: "Nouvelle tranche",
  };
}
