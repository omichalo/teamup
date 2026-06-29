"use client";

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
import type { PricingDevice, RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import { getEnabledSectionIds } from "@/lib/club-registration-config/helpers";
import { listPricingProfiles } from "@/lib/club-registration-config/pricing-profiles";
import { moveArrayItem } from "@/lib/club-registration-config/sort-order";
import { generateConfigItemId } from "./config-editor-utils";
import {
  ConfigEditorAddButton,
  ConfigEditorCollapsibleItem,
  ConfigEditorHint,
  ConfigEditorInfoAlert,
  ConfigEditorOptionPanel,
  ConfigEditorRoot,
} from "./ConfigEditorLayout";
import { useConfigEditorExpansion } from "./useConfigEditorExpansion";
import { ConfigEditorRemoveAction } from "./ConfigEditorRemoveAction";
import { pricingDeviceDecor } from "./config-editor-item-decor";
import {
  ConfigEditorDraggableItem,
  ConfigEditorSortableList,
} from "./ConfigEditorSortableList";

type Props = {
  config: RegistrationConfigV1;
  onChange: (config: RegistrationConfigV1) => void;
};

function conditionSummary(device: PricingDevice, config: RegistrationConfigV1): string {
  const sections = device.conditions.sectionIds
    .map((id) => config.sections.find((section) => section.id === id)?.label ?? id)
    .join(", ");
  return `${sections} · ${device.conditions.exactSlotCount} créneau(x) · loisir sans compétition`;
}

export function PricingDevicesEditor({ config, onChange }: Props) {
  const expansion = useConfigEditorExpansion();
  const sectionOptions = getEnabledSectionIds(config);
  const profileOptions = listPricingProfiles(config);
  const ageBandOptions = Object.keys(config.ageBandProfiles);

  const updateDevice = (index: number, patch: Partial<PricingDevice>) => {
    const pricingDevices = [...config.pricingDevices];
    pricingDevices[index] = { ...pricingDevices[index], ...patch };
    onChange({ ...config, pricingDevices });
  };

  const updateConditions = (
    index: number,
    patch: Partial<PricingDevice["conditions"]>
  ) => {
    const pricingDevices = [...config.pricingDevices];
    pricingDevices[index] = {
      ...pricingDevices[index],
      conditions: { ...pricingDevices[index].conditions, ...patch },
    };
    onChange({ ...config, pricingDevices });
  };

  const moveDevice = (fromIndex: number, toIndex: number) => {
    onChange({
      ...config,
      pricingDevices: moveArrayItem(config.pricingDevices, fromIndex, toIndex),
    });
  };

  return (
    <ConfigEditorRoot>
      <ConfigEditorInfoAlert>
        Dispositifs tarifaires conditionnels (ex. CHAMP&apos;YON). Le premier dispositif
        activé dont les conditions correspondent remplace le profil tarifaire de la section.
        Les montants d&apos;adhésion se règlent dans l&apos;onglet <strong>Tarifs</strong>{" "}
        (profil associé).
      </ConfigEditorInfoAlert>
      <ConfigEditorHint>
        Priorité : valeur la plus élevée évaluée en premier. Glissez-déposez pour l&apos;ordre
        d&apos;affichage.
      </ConfigEditorHint>
      <ConfigEditorSortableList droppableId="pricing-devices" onMove={moveDevice}>
        {config.pricingDevices.map((device, index) => (
          <ConfigEditorDraggableItem key={device.id} draggableId={device.id} index={index}>
            {({ dragHandleProps, isDragging }) => (
              <ConfigEditorCollapsibleItem
                expanded={expansion.isExpanded(device.id)}
                onExpandedChange={(open) => expansion.setExpanded(device.id, open)}
                title={device.label}
                itemLabel={device.label}
                meta={`${device.enabled ? "Actif" : "Inactif"} · ${conditionSummary(device, config)}`}
                decor={pricingDeviceDecor}
                dragHandleProps={dragHandleProps}
                isDragging={isDragging}
                removeButton={
                  device.builtIn ? null : (
                    <ConfigEditorRemoveAction
                      label="Supprimer le dispositif"
                      onClick={() =>
                        onChange({
                          ...config,
                          pricingDevices: config.pricingDevices.filter((_, i) => i !== index),
                        })
                      }
                    />
                  )
                }
              >
                <Stack spacing={2}>
                  <TextField
                    label="Libellé"
                    value={device.label}
                    onChange={(e) => updateDevice(index, { label: e.target.value })}
                    fullWidth
                  />
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                      label="Priorité"
                      type="number"
                      value={device.priority}
                      onChange={(e) =>
                        updateDevice(index, {
                          priority: Number.parseInt(e.target.value, 10) || 0,
                        })
                      }
                      inputProps={{ min: 0 }}
                      fullWidth
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={device.enabled}
                          onChange={(e) => updateDevice(index, { enabled: e.target.checked })}
                        />
                      }
                      label="Activé"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={device.stackableWithDiscounts}
                          onChange={(e) =>
                            updateDevice(index, {
                              stackableWithDiscounts: e.target.checked,
                            })
                          }
                        />
                      }
                      label="Cumulable avec remises catalogue"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={device.includesFfttLicense}
                          onChange={(e) =>
                            updateDevice(index, {
                              includesFfttLicense: e.target.checked,
                            })
                          }
                        />
                      }
                      label="Inclure la licence FFTT"
                    />
                  </Stack>
                  <FormControl fullWidth>
                    <InputLabel id={`device-sections-${device.id}`}>Sections éligibles</InputLabel>
                    <Select
                      labelId={`device-sections-${device.id}`}
                      multiple
                      label="Sections éligibles"
                      value={device.conditions.sectionIds}
                      onChange={(e) =>
                        updateConditions(index, {
                          sectionIds:
                            typeof e.target.value === "string"
                              ? e.target.value.split(",")
                              : e.target.value,
                        })
                      }
                      renderValue={(selected) =>
                        selected
                          .map(
                            (id) =>
                              config.sections.find((section) => section.id === id)?.label ?? id
                          )
                          .join(", ")
                      }
                    >
                      {sectionOptions.map((sectionId) => (
                        <MenuItem key={sectionId} value={sectionId}>
                          {config.sections.find((section) => section.id === sectionId)?.label ??
                            sectionId}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Nombre exact de créneaux"
                    type="number"
                    value={device.conditions.exactSlotCount}
                    onChange={(e) =>
                      updateConditions(index, {
                        exactSlotCount: Number.parseInt(e.target.value, 10) || 0,
                      })
                    }
                    inputProps={{ min: 0 }}
                    fullWidth
                  />
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <FormControl fullWidth>
                      <InputLabel id={`device-profile-${device.id}`}>Profil tarifaire</InputLabel>
                      <Select
                        labelId={`device-profile-${device.id}`}
                        label="Profil tarifaire"
                        value={device.pricingProfileId}
                        onChange={(e) =>
                          updateDevice(index, { pricingProfileId: e.target.value as string })
                        }
                      >
                        {profileOptions.map((profile) => (
                          <MenuItem key={profile.id} value={profile.id}>
                            {profile.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl fullWidth>
                      <InputLabel id={`device-age-${device.id}`}>Profil d&apos;âge</InputLabel>
                      <Select
                        labelId={`device-age-${device.id}`}
                        label="Profil d'âge"
                        value={device.ageBandProfileId ?? device.pricingProfileId}
                        onChange={(e) =>
                          updateDevice(index, { ageBandProfileId: e.target.value as string })
                        }
                      >
                        {ageBandOptions.map((profileId) => (
                          <MenuItem key={profileId} value={profileId}>
                            {config.ageBandProfiles[profileId]?.label ?? profileId}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>
                  <TextField
                    label="Préfixe libellé segment (devis)"
                    value={device.uiCopy?.segmentLabelPrefix ?? ""}
                    onChange={(e) =>
                      updateDevice(index, {
                        uiCopy: {
                          ...device.uiCopy,
                          segmentLabelPrefix: e.target.value || undefined,
                        },
                      })
                    }
                    fullWidth
                  />
                  <TextField
                    label="Texte récap formulaire"
                    value={device.uiCopy?.recapHint ?? ""}
                    onChange={(e) =>
                      updateDevice(index, {
                        uiCopy: {
                          ...device.uiCopy,
                          recapHint: e.target.value || undefined,
                        },
                      })
                    }
                    multiline
                    minRows={2}
                    fullWidth
                  />
                  <TextField
                    label="Badge secrétariat"
                    value={device.uiCopy?.adminBadge ?? ""}
                    onChange={(e) =>
                      updateDevice(index, {
                        uiCopy: {
                          ...device.uiCopy,
                          adminBadge: e.target.value || undefined,
                        },
                      })
                    }
                    fullWidth
                  />
                </Stack>
              </ConfigEditorCollapsibleItem>
            )}
          </ConfigEditorDraggableItem>
        ))}
      </ConfigEditorSortableList>
      <ConfigEditorAddButton
        label="Ajouter un dispositif"
        onClick={() => {
          const id = generateConfigItemId("device");
          const device: PricingDevice = {
            id,
            label: "Nouveau dispositif",
            enabled: true,
            sortOrder: config.pricingDevices.length,
            priority: 0,
            conditions: {
              sectionIds: sectionOptions.slice(0, 1),
              exactSlotCount: 1,
              requiresNoAdditionalSections: true,
              requiresNoCompetitorExtras: true,
              requiresNoCompetitionSelection: true,
            },
            pricingProfileId: profileOptions[0]?.id ?? "classic",
            ageBandProfileId: "classic",
            stackableWithDiscounts: false,
            includesFfttLicense: true,
          };
          onChange({
            ...config,
            pricingDevices: [...config.pricingDevices, device],
          });
          expansion.setExpanded(id, true);
        }}
      />
      <ConfigEditorOptionPanel title="Conditions fixes (CHAMP'YON et similaires)">
        Les dispositifs créés via ce formulaire imposent : aucune section complémentaire, pas de
        section compétiteur, aucune compétition cochée.
      </ConfigEditorOptionPanel>
    </ConfigEditorRoot>
  );
}
