"use client";

import { Stack, TextField } from "@mui/material";
import type { PricingProfileDefinition, RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import {
  moveBySortOrder,
  nextSortOrder,
  reindexSortOrder,
} from "@/lib/club-registration-config/sort-order";
import {
  canRemovePricingProfile,
  formatConfigUsageMessage,
  getPricingProfileUsage,
} from "@/lib/club-registration-config/config-usage";
import { listPricingProfiles } from "@/lib/club-registration-config/pricing-profiles";
import { generateConfigItemId } from "./config-editor-utils";
import {
  ConfigEditorAddButton,
  ConfigEditorCollapsibleItem,
  ConfigEditorHint,
  ConfigEditorInfoAlert,
  ConfigEditorRoot,
} from "./ConfigEditorLayout";
import { ConfigEditorRemoveAction } from "./ConfigEditorRemoveAction";
import { decorFromPricingProfile } from "./config-editor-item-decor";
import {
  ConfigEditorDraggableItem,
  ConfigEditorSortableList,
} from "./ConfigEditorSortableList";
import { useConfigEditorExpansion } from "./useConfigEditorExpansion";
import {
  PricingProfileAccentField,
  PricingProfileBehaviorField,
  PricingProfileIconField,
  pricingProfileSummaryMeta,
} from "./PricingProfileFormFields";

type Props = {
  config: RegistrationConfigV1;
  onChange: (config: RegistrationConfigV1) => void;
};

export function PricingProfilesEditor({ config, onChange }: Props) {
  const expansion = useConfigEditorExpansion();
  const profiles = listPricingProfiles(config);

  const updateProfile = (profileId: string, patch: Partial<PricingProfileDefinition>) => {
    const current = config.pricingProfiles[profileId];
    if (!current) return;
    onChange({
      ...config,
      pricingProfiles: {
        ...config.pricingProfiles,
        [profileId]: { ...current, ...patch },
      },
    });
  };

  const moveProfile = (fromIndex: number, toIndex: number) => {
    const sorted = listPricingProfiles(config);
    const reordered = moveBySortOrder(sorted, fromIndex, toIndex);
    onChange({
      ...config,
      pricingProfiles: Object.fromEntries(reordered.map((def, index) => [def.id, { ...def, sortOrder: index }])),
    });
  };

  const removeProfile = (profileId: string) => {
    const remaining = { ...config.pricingProfiles };
    delete remaining[profileId];
    onChange({
      ...config,
      pricingProfiles: Object.fromEntries(
        reindexSortOrder(Object.values(remaining)).map((def, index) => [def.id, { ...def, sortOrder: index }])
      ),
    });
  };

  return (
    <ConfigEditorRoot>
      <ConfigEditorInfoAlert>
        Un <strong>profil tarifaire</strong> regroupe la <strong>logique de calcul</strong> (ce que
        le formulaire demande et comment chercher une ligne dans <strong>Tarifs</strong>), plus le
        libellé, la couleur et l&apos;icône pour cet écran admin.
      </ConfigEditorInfoAlert>
      <ConfigEditorHint>
        Les profils fournis par défaut ne sont pas supprimables. Un profil personnalisé ne peut être
        retiré que s&apos;il n&apos;est référencé par aucune section ni règle tarifaire.
      </ConfigEditorHint>

      <ConfigEditorSortableList droppableId="pricing-profiles" onMove={moveProfile}>
        {profiles.map((profile, index) => {
          const removeCheck = canRemovePricingProfile(config, profile.id);
          const usageHint = formatConfigUsageMessage(getPricingProfileUsage(config, profile.id));

          return (
            <ConfigEditorDraggableItem key={profile.id} draggableId={profile.id} index={index}>
              {({ dragHandleProps, isDragging }) => (
                <ConfigEditorCollapsibleItem
                  expanded={expansion.isExpanded(profile.id)}
                  onExpandedChange={(open) => expansion.setExpanded(profile.id, open)}
                  title={profile.label}
                  itemLabel={profile.label}
                  meta={pricingProfileSummaryMeta(profile)}
                  decor={decorFromPricingProfile(profile)}
                  dragHandleProps={dragHandleProps}
                  isDragging={isDragging}
                  removeButton={
                    <ConfigEditorRemoveAction
                      label="Supprimer le profil tarifaire"
                      disabled={!removeCheck.allowed}
                      disabledReason={removeCheck.reason ?? usageHint}
                      onClick={() => removeProfile(profile.id)}
                    />
                  }
                >
                  <TextField
                    label="Libellé"
                    size="small"
                    value={profile.label}
                    onChange={(e) => updateProfile(profile.id, { label: e.target.value })}
                    fullWidth
                  />
                  <TextField
                    label="Identifiant technique"
                    size="small"
                    value={profile.id}
                    disabled
                    fullWidth
                  />
                  <PricingProfileBehaviorField
                    value={profile.behavior}
                    disabled={profile.builtIn === true}
                    onChange={(behavior) => updateProfile(profile.id, { behavior })}
                  />
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    <PricingProfileAccentField
                      value={profile.accent}
                      onChange={(accent) => updateProfile(profile.id, { accent })}
                    />
                    <PricingProfileIconField
                      value={profile.iconKey}
                      onChange={(iconKey) => updateProfile(profile.id, { iconKey })}
                    />
                  </Stack>
                </ConfigEditorCollapsibleItem>
              )}
            </ConfigEditorDraggableItem>
          );
        })}
      </ConfigEditorSortableList>

      <ConfigEditorAddButton
        label="Ajouter un profil tarifaire"
        onClick={() => {
          const id = generateConfigItemId("pricing_profile");
          const profile: PricingProfileDefinition = {
            id,
            label: "Nouveau profil",
            sortOrder: nextSortOrder(listPricingProfiles(config)),
            accent: "primary",
            iconKey: "category",
            behavior: "classic_like",
          };
          onChange({
            ...config,
            pricingProfiles: { ...config.pricingProfiles, [id]: profile },
          });
          expansion.expandItem(id);
        }}
      />
    </ConfigEditorRoot>
  );
}
