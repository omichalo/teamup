"use client";

import {
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
} from "@mui/material";
import type {
  CompetitionBundle,
  RegistrationCompetition,
  RegistrationConfigV1,
} from "@/lib/club-registration-config/types";
import { moveArrayItem } from "@/lib/club-registration-config/sort-order";
import { RegistrationMultiSelectField } from "@/components/club-registration/RegistrationMultiSelectField";
import { EuroAmountField } from "./EuroAmountField";
import { generateConfigItemId } from "./config-editor-utils";
import {
  ConfigEditorAddButton,
  ConfigEditorCollapsibleItem,
  ConfigEditorDividerSection,
  ConfigEditorEmptyState,
  ConfigEditorHint,
  ConfigEditorInfoAlert,
  ConfigEditorOptionPanel,
  ConfigEditorRoot,
  ConfigEditorSectionTitle,
} from "./ConfigEditorLayout";
import { centsToEuroInput } from "./config-editor-utils";
import { configEditorSwitchLabelSx } from "./config-editor-layout";
import { useConfigEditorExpansion } from "./useConfigEditorExpansion";
import { ConfigEditorRemoveAction } from "./ConfigEditorRemoveAction";
import { canRemoveCompetition } from "@/lib/club-registration-config/config-usage";
import { competitionSummaryMeta } from "./config-editor-summary-meta";
import { competitionBundleDecor, competitionItemDecor } from "./config-editor-item-decor";
import {
  ConfigEditorDraggableItem,
  ConfigEditorSortableList,
} from "./ConfigEditorSortableList";

type Props = {
  config: RegistrationConfigV1;
  onChange: (config: RegistrationConfigV1) => void;
};

function newCompetition(): RegistrationCompetition {
  return {
    id: generateConfigItemId("comp"),
    formLabel: "Nouvelle compétition",
    stripeLabel: "Compétition",
    priceCents: 0,
    formGroup: "other",
    enabled: true,
  };
}

function newCompetitionBundle(): CompetitionBundle {
  return {
    billingId: generateConfigItemId("bundle"),
    sourceIds: [],
    priceCents: 0,
    stripeLabel: "Regroupement",
  };
}

export function CompetitionsEditor({ config, onChange }: Props) {
  const expansion = useConfigEditorExpansion();
  const competitionOptions = config.competitions.map((comp) => ({
    value: comp.id,
    label: comp.formLabel,
  }));

  const updateCompetition = (compId: string, patch: Partial<RegistrationCompetition>) => {
    onChange({
      ...config,
      competitions: config.competitions.map((comp) =>
        comp.id === compId ? { ...comp, ...patch } : comp
      ),
    });
  };

  const updateBundle = (billingId: string, patch: Partial<CompetitionBundle>) => {
    onChange({
      ...config,
      competitionBundles: config.competitionBundles.map((bundle) =>
        bundle.billingId === billingId ? { ...bundle, ...patch } : bundle
      ),
    });
  };

  const moveCompetition = (fromIndex: number, toIndex: number) => {
    onChange({
      ...config,
      competitions: moveArrayItem(config.competitions, fromIndex, toIndex),
    });
  };

  const moveBundle = (fromIndex: number, toIndex: number) => {
    onChange({
      ...config,
      competitionBundles: moveArrayItem(config.competitionBundles, fromIndex, toIndex),
    });
  };

  return (
    <ConfigEditorRoot>
      <ConfigEditorInfoAlert>
        Options de <strong>compétition</strong> proposées aux adhérents. Chaque option peut avoir un
        libellé formulaire, un libellé Stripe et un prix distinct.
      </ConfigEditorInfoAlert>
      <ConfigEditorHint>
        Glissez-déposez pour définir l&apos;ordre du formulaire. Les regroupements permettent de
        fusionner plusieurs cases en une seule ligne Stripe.
      </ConfigEditorHint>

      <Stack spacing={2}>
        <ConfigEditorSectionTitle>Options du formulaire</ConfigEditorSectionTitle>
        {config.competitions.length === 0 ? (
          <ConfigEditorEmptyState
            title="Aucune compétition"
            description="Ajoutez les options de compétition proposées aux adhérents."
            action={
              <ConfigEditorAddButton
                label="Ajouter une compétition"
                variant="contained"
                onClick={() => {
                  const comp = newCompetition();
                  onChange({
                    ...config,
                    competitions: [comp],
                  });
                  expansion.expandItem(comp.id);
                }}
              />
            }
          />
        ) : (
          <ConfigEditorSortableList droppableId="competitions" onMove={moveCompetition}>
            {config.competitions.map((comp, index) => (
              <ConfigEditorDraggableItem key={comp.id} draggableId={comp.id} index={index}>
                {({ dragHandleProps, isDragging }) => (
                  <ConfigEditorCollapsibleItem
                    expanded={expansion.isExpanded(comp.id)}
                    onExpandedChange={(open) => expansion.setExpanded(comp.id, open)}
                    title={comp.formLabel}
                    itemLabel={comp.formLabel}
                    meta={competitionSummaryMeta(comp)}
                    decor={competitionItemDecor(comp)}
                    dragHandleProps={dragHandleProps}
                    isDragging={isDragging}
                    removeButton={
                      <ConfigEditorRemoveAction
                        label="Supprimer la compétition"
                        disabled={!canRemoveCompetition(config, comp.id).allowed}
                        disabledReason={canRemoveCompetition(config, comp.id).reason}
                        onClick={() =>
                          onChange({
                            ...config,
                            competitions: config.competitions.filter((item) => item.id !== comp.id),
                          })
                        }
                      />
                    }
                  >
              <TextField
                label="Libellé affiché aux familles"
                size="small"
                value={comp.formLabel}
                onChange={(e) => updateCompetition(comp.id, { formLabel: e.target.value })}
                fullWidth
              />
              <ConfigEditorOptionPanel title="Facturation Stripe">
                <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                  <TextField
                    label="Libellé Stripe"
                    size="small"
                    value={comp.stripeLabel}
                    onChange={(e) => updateCompetition(comp.id, { stripeLabel: e.target.value })}
                    sx={{ flex: 2 }}
                  />
                  <EuroAmountField
                    label="Prix"
                    valueCents={comp.priceCents}
                    onChangeCents={(priceCents) => updateCompetition(comp.id, { priceCents })}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    select
                    label="Groupe affichage"
                    size="small"
                    value={comp.formGroup}
                    onChange={(e) =>
                      updateCompetition(comp.id, {
                        formGroup: e.target.value as RegistrationCompetition["formGroup"],
                      })
                    }
                    sx={{ flex: 1 }}
                  >
                    <MenuItem value="youth">Jeunes</MenuItem>
                    <MenuItem value="other">Autres</MenuItem>
                  </TextField>
                </Stack>
              </ConfigEditorOptionPanel>
              <FormControlLabel
                sx={configEditorSwitchLabelSx}
                control={
                  <Switch
                    checked={comp.requiresAvailabilityCommitment === true}
                    onChange={(e) =>
                      updateCompetition(comp.id, {
                        requiresAvailabilityCommitment: e.target.checked,
                      })
                    }
                  />
                }
                label="Afficher l'engagement de disponibilité (amendes forfaits)"
              />
              <FormControlLabel
                sx={configEditorSwitchLabelSx}
                control={
                  <Switch
                    checked={comp.enabled}
                    onChange={(e) => updateCompetition(comp.id, { enabled: e.target.checked })}
                  />
                }
                label="Option visible dans le formulaire"
              />
                  </ConfigEditorCollapsibleItem>
                )}
              </ConfigEditorDraggableItem>
            ))}
          </ConfigEditorSortableList>
        )}
        {config.competitions.length > 0 && (
          <ConfigEditorAddButton
            label="Ajouter une compétition"
            onClick={() => {
              const comp = newCompetition();
              onChange({
                ...config,
                competitions: [...config.competitions, comp],
              });
              expansion.expandItem(comp.id);
            }}
          />
        )}
      </Stack>

      <ConfigEditorDividerSection title="Regroupements facturation Stripe">
        <ConfigEditorHint>
          Plusieurs options cochées → une seule ligne Stripe (ex. compétitions jeunes). Glissez pour
          réordonner.
        </ConfigEditorHint>
        <ConfigEditorSortableList droppableId="competition-bundles" onMove={moveBundle}>
          {config.competitionBundles.map((bundle, index) => (
            <ConfigEditorDraggableItem
              key={bundle.billingId}
              draggableId={bundle.billingId}
              index={index}
            >
              {({ dragHandleProps, isDragging }) => (
                <ConfigEditorCollapsibleItem
                  expanded={expansion.isExpanded(bundle.billingId)}
                  onExpandedChange={(open) => expansion.setExpanded(bundle.billingId, open)}
                  title={bundle.stripeLabel}
                  itemLabel={bundle.stripeLabel}
                  meta={`${bundle.sourceIds.length} compétition${bundle.sourceIds.length > 1 ? "s" : ""} · ${centsToEuroInput(bundle.priceCents)} €`}
                  decor={competitionBundleDecor}
                  dragHandleProps={dragHandleProps}
                  isDragging={isDragging}
                  removeButton={
                    <ConfigEditorRemoveAction
                      label="Supprimer le regroupement"
                      onClick={() =>
                        onChange({
                          ...config,
                          competitionBundles: config.competitionBundles.filter(
                            (item) => item.billingId !== bundle.billingId
                          ),
                        })
                      }
                    />
                  }
                >
            <RegistrationMultiSelectField
              label="Compétitions regroupées"
              value={bundle.sourceIds}
              options={competitionOptions}
              onChange={(sourceIds) => updateBundle(bundle.billingId, { sourceIds })}
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <TextField
                label="Libellé Stripe"
                size="small"
                value={bundle.stripeLabel}
                onChange={(e) => updateBundle(bundle.billingId, { stripeLabel: e.target.value })}
                sx={{ flex: 1 }}
              />
              <EuroAmountField
                label="Prix du regroupement"
                valueCents={bundle.priceCents}
                onChangeCents={(priceCents) => updateBundle(bundle.billingId, { priceCents })}
                sx={{ flex: 1 }}
              />
            </Stack>
                </ConfigEditorCollapsibleItem>
              )}
            </ConfigEditorDraggableItem>
          ))}
        </ConfigEditorSortableList>
        <ConfigEditorAddButton
          label="Ajouter un regroupement"
          onClick={() => {
            const bundle = newCompetitionBundle();
            onChange({
              ...config,
              competitionBundles: [...config.competitionBundles, bundle],
            });
            expansion.expandItem(bundle.billingId);
          }}
        />
      </ConfigEditorDividerSection>
    </ConfigEditorRoot>
  );
}
