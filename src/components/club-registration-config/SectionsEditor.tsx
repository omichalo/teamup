"use client";

import {
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
} from "@mui/material";
import type { RegistrationConfigV1, RegistrationSection } from "@/lib/club-registration-config/types";
import {
  moveBySortOrder,
  nextSortOrder,
  reindexSortOrder,
  sortBySortOrder,
} from "@/lib/club-registration-config/sort-order";
import {
  defaultAgeBandProfileIdForPricingProfile,
  listPricingProfiles,
} from "@/lib/club-registration-config/pricing-profiles";
import { canRemoveSection } from "@/lib/club-registration-config/config-usage";
import { generateConfigItemId } from "./config-editor-utils";
import {
  ConfigEditorAddButton,
  ConfigEditorCollapsibleItem,
  ConfigEditorHint,
  ConfigEditorInfoAlert,
  ConfigEditorRoot,
} from "./ConfigEditorLayout";
import { ConfigEditorRemoveAction } from "./ConfigEditorRemoveAction";
import { sectionItemDecor } from "./config-editor-item-decor";
import { sectionSummaryMeta } from "./config-editor-summary-meta";
import { configEditorSwitchLabelSx } from "./config-editor-layout";
import {
  ConfigEditorDraggableItem,
  ConfigEditorSortableList,
} from "./ConfigEditorSortableList";
import { useConfigEditorExpansion } from "./useConfigEditorExpansion";

type Props = {
  config: RegistrationConfigV1;
  onChange: (config: RegistrationConfigV1) => void;
};

function newSection(sortOrder: number): RegistrationSection {
  return {
    id: generateConfigItemId("section"),
    label: "Nouvelle section",
    sortOrder,
    pricingProfile: "classic",
    ageBandProfileId: "classic",
    enabled: true,
  };
}

export function SectionsEditor({ config, onChange }: Props) {
  const profileIds = Object.keys(config.ageBandProfiles);
  const sortedSections = sortBySortOrder(config.sections);
  const expansion = useConfigEditorExpansion();

  const updateSection = (sectionId: string, patch: Partial<RegistrationSection>) => {
    onChange({
      ...config,
      sections: config.sections.map((section) =>
        section.id === sectionId ? { ...section, ...patch } : section
      ),
    });
  };

  const removeSection = (sectionId: string) => {
    onChange({
      ...config,
      sections: reindexSortOrder(config.sections.filter((section) => section.id !== sectionId)),
    });
  };

  const moveSection = (fromIndex: number, toIndex: number) => {
    onChange({
      ...config,
      sections: moveBySortOrder(config.sections, fromIndex, toIndex),
    });
  };

  return (
    <ConfigEditorRoot>
      <ConfigEditorInfoAlert>
        Une <strong>section</strong> est une activité proposée dans le formulaire (Loisirs, Compétition,
        Handisport…). Elle détermine le profil tarifaire et les tranches d&apos;âge applicables.
      </ConfigEditorInfoAlert>
      <ConfigEditorHint>
        Glissez-déposez pour définir l&apos;ordre d&apos;affichage. Les lieux se configurent dans
        l&apos;onglet suivant.
      </ConfigEditorHint>
      <ConfigEditorSortableList droppableId="sections" onMove={moveSection}>
        {sortedSections.map((section, index) => (
          <ConfigEditorDraggableItem key={section.id} draggableId={section.id} index={index}>
            {({ dragHandleProps, isDragging }) => (
              <ConfigEditorCollapsibleItem
                expanded={expansion.isExpanded(section.id)}
                onExpandedChange={(open) => expansion.setExpanded(section.id, open)}
                title={section.label}
                itemLabel={section.label}
                meta={sectionSummaryMeta(config, section)}
                decor={sectionItemDecor(config, section)}
                dragHandleProps={dragHandleProps}
                isDragging={isDragging}
                removeButton={
                  <ConfigEditorRemoveAction
                    label="Supprimer la section"
                    disabled={!canRemoveSection(config, section.id).allowed}
                    disabledReason={canRemoveSection(config, section.id).reason}
                    onClick={() => removeSection(section.id)}
                  />
                }
              >
                <TextField
                  label="Libellé affiché aux familles"
                  size="small"
                  value={section.label}
                  onChange={(e) => updateSection(section.id, { label: e.target.value })}
                  fullWidth
                />
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <TextField
                    select
                    label="Profil tarifaire"
                    size="small"
                    value={section.pricingProfile}
                    onChange={(e) => {
                      const pricingProfile = e.target
                        .value as RegistrationSection["pricingProfile"];
                      updateSection(section.id, {
                        pricingProfile,
                        ageBandProfileId: defaultAgeBandProfileIdForPricingProfile(config, pricingProfile),
                      });
                    }}
                    sx={{ flex: 1 }}
                    helperText="Classique, handisport, sport adapté ou école de ping"
                  >
                    {listPricingProfiles(config).map((profile) => (
                      <MenuItem key={profile.id} value={profile.id}>
                        {profile.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Profil de tranches d'âge"
                    size="small"
                    value={section.ageBandProfileId}
                    onChange={(e) => updateSection(section.id, { ageBandProfileId: e.target.value })}
                    sx={{ flex: 1 }}
                    helperText="Défini dans l'onglet Profils d'âge"
                  >
                    {profileIds.map((id) => (
                      <MenuItem key={id} value={id}>
                        {config.ageBandProfiles[id]?.label ?? id}
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>
                <FormControlLabel
                  sx={configEditorSwitchLabelSx}
                  control={
                    <Switch
                      checked={section.enabled}
                      onChange={(e) => updateSection(section.id, { enabled: e.target.checked })}
                    />
                  }
                  label="Section visible dans le formulaire"
                />
              </ConfigEditorCollapsibleItem>
            )}
          </ConfigEditorDraggableItem>
        ))}
      </ConfigEditorSortableList>
      <ConfigEditorAddButton
        label="Ajouter une section"
        onClick={() => {
          const section = newSection(nextSortOrder(config.sections));
          onChange({
            ...config,
            sections: [...config.sections, section],
          });
          expansion.expandItem(section.id);
        }}
      />
    </ConfigEditorRoot>
  );
}
