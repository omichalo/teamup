"use client";

import { MenuItem, Stack, TextField } from "@mui/material";
import type { DiscountRule, RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import { moveArrayItem } from "@/lib/club-registration-config/sort-order";
import { EuroAmountField } from "./EuroAmountField";
import { generateConfigItemId } from "./config-editor-utils";
import {
  ConfigEditorAddButton,
  ConfigEditorCollapsibleItem,
  ConfigEditorHint,
  ConfigEditorInfoAlert,
  ConfigEditorOptionPanel,
  ConfigEditorRoot,
} from "./ConfigEditorLayout";
import { centsToEuroInput } from "./config-editor-utils";

import { useConfigEditorExpansion } from "./useConfigEditorExpansion";
import { ConfigEditorRemoveAction } from "./ConfigEditorRemoveAction";
import { discountRuleDecor } from "./config-editor-item-decor";
import {
  ConfigEditorDraggableItem,
  ConfigEditorSortableList,
} from "./ConfigEditorSortableList";

type Props = {
  config: RegistrationConfigV1;
  onChange: (config: RegistrationConfigV1) => void;
};

function conditionSummary(rule: DiscountRule): string {
  const parts: string[] = [];
  if (rule.conditions.familyRegistrationOrder === "second") parts.push("2e adhérent");
  if (rule.conditions.familyRegistrationOrder === "third_or_more") parts.push("3e+");
  if (rule.conditions.sex === "female") parts.push("Féminin");
  if (rule.conditions.firstFemaleRegistrationSqy === true) parts.push("1re femme SQY");
  return parts.length > 0 ? parts.join(", ") : "Sans condition";
}

export function DiscountRulesEditor({ config, onChange }: Props) {
  const expansion = useConfigEditorExpansion();
  const updateRule = (index: number, patch: Partial<DiscountRule>) => {
    const discountRules = [...config.discountRules];
    discountRules[index] = { ...discountRules[index], ...patch };
    onChange({ ...config, discountRules });
  };

  const updateConditions = (index: number, patch: Partial<DiscountRule["conditions"]>) => {
    const discountRules = [...config.discountRules];
    discountRules[index] = {
      ...discountRules[index],
      conditions: { ...discountRules[index].conditions, ...patch },
    };
    onChange({ ...config, discountRules });
  };

  const moveRule = (fromIndex: number, toIndex: number) => {
    onChange({
      ...config,
      discountRules: moveArrayItem(config.discountRules, fromIndex, toIndex),
    });
  };

  return (
    <ConfigEditorRoot>
      <ConfigEditorInfoAlert>
        Remises appliquées sur l&apos;adhésion club uniquement. Les règles sont évaluées{" "}
        <strong>dans l&apos;ordre</strong> : seules celles dont les conditions correspondent sont
        appliquées.
      </ConfigEditorInfoAlert>
      <ConfigEditorHint>
        Montants saisis en euros. Glissez-déposez pour ajuster l&apos;ordre d&apos;évaluation.
      </ConfigEditorHint>
      <ConfigEditorSortableList droppableId="discount-rules" onMove={moveRule}>
        {config.discountRules.map((rule, index) => (
          <ConfigEditorDraggableItem key={rule.id} draggableId={rule.id} index={index}>
            {({ dragHandleProps, isDragging }) => (
              <ConfigEditorCollapsibleItem
                expanded={expansion.isExpanded(rule.id)}
                onExpandedChange={(open) => expansion.setExpanded(rule.id, open)}
                title={rule.label}
                itemLabel={rule.label}
                meta={`${conditionSummary(rule)} · −${centsToEuroInput(rule.amountCents)} €`}
                decor={discountRuleDecor}
                dragHandleProps={dragHandleProps}
                isDragging={isDragging}
                removeButton={
                  <ConfigEditorRemoveAction
                    label="Supprimer la remise"
                    onClick={() =>
                      onChange({
                        ...config,
                        discountRules: config.discountRules.filter((_, i) => i !== index),
                      })
                    }
                  />
                }
              >
          <TextField
            label="Libellé sur la facture"
            size="small"
            value={rule.label}
            onChange={(e) => updateRule(index, { label: e.target.value })}
            fullWidth
          />
          <EuroAmountField
            label="Montant de la remise"
            valueCents={rule.amountCents}
            onChangeCents={(amountCents) => updateRule(index, { amountCents })}
            fullWidth
          />
          <ConfigEditorOptionPanel title="Conditions d'application">
            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              <TextField
                select
                label="Ordre famille"
                size="small"
                value={rule.conditions.familyRegistrationOrder ?? ""}
                onChange={(e) =>
                  updateConditions(index, {
                    familyRegistrationOrder: (e.target.value ||
                      undefined) as DiscountRule["conditions"]["familyRegistrationOrder"],
                  })
                }
                sx={{ flex: 1 }}
              >
                <MenuItem value="">—</MenuItem>
                <MenuItem value="second">2e adhérent</MenuItem>
                <MenuItem value="third_or_more">3e ou plus</MenuItem>
              </TextField>
              <TextField
                select
                label="Sexe"
                size="small"
                value={rule.conditions.sex ?? ""}
                onChange={(e) =>
                  updateConditions(index, {
                    sex: (e.target.value || undefined) as DiscountRule["conditions"]["sex"],
                  })
                }
                sx={{ flex: 1 }}
              >
                <MenuItem value="">—</MenuItem>
                <MenuItem value="female">Féminin</MenuItem>
              </TextField>
              <TextField
                select
                label="1re inscription féminine"
                size="small"
                value={
                  rule.conditions.firstFemaleRegistrationSqy === undefined
                    ? ""
                    : rule.conditions.firstFemaleRegistrationSqy
                      ? "true"
                      : "false"
                }
                onChange={(e) =>
                  updateConditions(index, {
                    firstFemaleRegistrationSqy:
                      e.target.value === "" ? undefined : e.target.value === "true",
                  })
                }
                sx={{ flex: 1 }}
              >
                <MenuItem value="">—</MenuItem>
                <MenuItem value="true">Oui</MenuItem>
                <MenuItem value="false">Non</MenuItem>
              </TextField>
            </Stack>
          </ConfigEditorOptionPanel>
              </ConfigEditorCollapsibleItem>
            )}
          </ConfigEditorDraggableItem>
        ))}
      </ConfigEditorSortableList>
      <ConfigEditorAddButton
        label="Ajouter une remise"
        onClick={() => {
          const rule = {
            id: generateConfigItemId("discount"),
            conditions: {},
            amountCents: 0,
            label: "Nouvelle remise",
            appliesTo: "membership" as const,
            stripeKind: "discount_family" as const,
          };
          onChange({
            ...config,
            discountRules: [...config.discountRules, rule],
          });
          expansion.expandItem(rule.id);
        }}
      />
    </ConfigEditorRoot>
  );
}
