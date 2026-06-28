"use client";

import { InputAdornment, MenuItem, Stack, TextField, Typography } from "@mui/material";
import type {
  AidRule,
  AidRuleFormPresentation,
  RegistrationConfigV1,
} from "@/lib/club-registration-config/types";
import { moveArrayItem } from "@/lib/club-registration-config/sort-order";
import { getAidRuleMaxAmountCents } from "@/lib/club-registration-config/aid-rules";
import { generateConfigItemId, centsToEuroInput, euroInputToCents } from "./config-editor-utils";
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
import { aidRuleDecor } from "./config-editor-item-decor";
import {
  ConfigEditorDraggableItem,
  ConfigEditorSortableList,
} from "./ConfigEditorSortableList";

type Props = {
  config: RegistrationConfigV1;
  onChange: (config: RegistrationConfigV1) => void;
};

function defaultAidForm(): AidRuleFormPresentation {
  return { style: "checkbox" };
}

function aidSummaryMeta(rule: AidRule, form: AidRuleFormPresentation): string | undefined {
  const parts: string[] = [];
  if (form.style === "toggle") parts.push("Interrupteur avec code de référence");
  const maxCents = getAidRuleMaxAmountCents(rule);
  if (maxCents !== undefined) {
    parts.push(`Plafond ${centsToEuroInput(maxCents)} €`);
  }
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

export function AidRulesEditor({ config, onChange }: Props) {
  const expansion = useConfigEditorExpansion();

  const updateRule = (index: number, patch: Partial<AidRule>) => {
    const aidRules = [...config.aidRules];
    aidRules[index] = {
      ...aidRules[index],
      ...patch,
      effect: { type: "admin_review" },
    };
    onChange({ ...config, aidRules });
  };

  const updateForm = (index: number, form: AidRuleFormPresentation) => {
    updateRule(index, { form });
  };

  const moveRule = (fromIndex: number, toIndex: number) => {
    onChange({
      ...config,
      aidRules: moveArrayItem(config.aidRules, fromIndex, toIndex),
    });
  };

  return (
    <ConfigEditorRoot>
      <ConfigEditorInfoAlert>
        Chaque aide déclenche une <strong>validation secrétariat</strong> : le montant
        n&apos;est pas calculé automatiquement dans le devis.
      </ConfigEditorInfoAlert>
      <ConfigEditorHint>
        Choisissez la présentation formulaire : case à cocher, ou interrupteur avec champ
        code (ex. Pass Sport). Glissez-déposez pour ajuster l&apos;ordre côté familles.
      </ConfigEditorHint>
      <ConfigEditorSortableList droppableId="aid-rules" onMove={moveRule}>
        {config.aidRules.map((rule, index) => {
          const form = rule.form ?? defaultAidForm();
          return (
            <ConfigEditorDraggableItem key={rule.id} draggableId={rule.id} index={index}>
              {({ dragHandleProps, isDragging }) => (
                <ConfigEditorCollapsibleItem
                  expanded={expansion.isExpanded(rule.id)}
                  onExpandedChange={(open) => expansion.setExpanded(rule.id, open)}
                  title={rule.label}
                  itemLabel={rule.label}
                  meta={aidSummaryMeta(rule, form)}
                  decor={aidRuleDecor}
                  dragHandleProps={dragHandleProps}
                  isDragging={isDragging}
                  removeButton={
                    <ConfigEditorRemoveAction
                      label="Supprimer l'aide"
                      onClick={() =>
                        onChange({ ...config, aidRules: config.aidRules.filter((_, i) => i !== index) })
                      }
                    />
                  }
                >
            <TextField
              label="Libellé affiché aux familles"
              size="small"
              value={rule.label}
              onChange={(e) => updateRule(index, { label: e.target.value })}
              fullWidth
            />
            <TextField
              label="Texte d'accompagnement (facultatif)"
              size="small"
              value={rule.helperText ?? ""}
              onChange={(e) =>
                updateRule(index, {
                  helperText: e.target.value.trim() ? e.target.value : undefined,
                })
              }
              fullWidth
              multiline
              minRows={2}
              helperText="Affiché aux familles à côté de l'aide (conditions, montant indicatif, etc.)."
            />
            <TextField
              label="Montant maximum (facultatif)"
              size="small"
              type="number"
              value={
                rule.maxAmountCents !== undefined ? centsToEuroInput(rule.maxAmountCents) : ""
              }
              onChange={(e) => {
                const raw = e.target.value;
                if (!raw.trim()) {
                  updateRule(index, { maxAmountCents: undefined });
                  return;
                }
                updateRule(index, { maxAmountCents: euroInputToCents(raw) });
              }}
              fullWidth
              inputProps={{ min: 0, step: 0.01 }}
              InputProps={{
                endAdornment: <InputAdornment position="end">€</InputAdornment>,
              }}
              helperText="Plafond du montant saisi par la famille. Laisser vide pour aucune limite."
            />
            <Typography variant="caption" color="text.secondary" display="block">
              Identifiant technique : <strong>{rule.id}</strong>
            </Typography>
            <ConfigEditorOptionPanel title="Présentation dans le formulaire">
              <Stack spacing={1.5}>
                <TextField
                  select
                  label="Type de contrôle"
                  size="small"
                  value={form.style}
                  onChange={(e) => {
                    const style = e.target.value as AidRuleFormPresentation["style"];
                    if (style === "checkbox") {
                      updateForm(index, { style: "checkbox" });
                      return;
                    }
                    updateForm(index, {
                      style: "toggle",
                      toggleLabel: `J'ai ${rule.label.startsWith("un ") || rule.label.startsWith("une ") ? rule.label : `un ${rule.label}`}`,
                      referenceCode: {
                        label: `Code ${rule.label}`,
                        helperText: "",
                        maxLength: 80,
                      },
                    });
                  }}
                  fullWidth
                >
                  <MenuItem value="checkbox">Case à cocher</MenuItem>
                  <MenuItem value="toggle">Interrupteur avec code de référence</MenuItem>
                </TextField>
                {form.style === "toggle" ? (
                  <>
                    <TextField
                      label="Libellé de l'interrupteur"
                      size="small"
                      value={form.toggleLabel}
                      onChange={(e) =>
                        updateForm(index, { ...form, toggleLabel: e.target.value })
                      }
                      fullWidth
                    />
                    <TextField
                      label="Libellé du champ code"
                      size="small"
                      value={form.referenceCode.label}
                      onChange={(e) =>
                        updateForm(index, {
                          ...form,
                          referenceCode: { ...form.referenceCode, label: e.target.value },
                        })
                      }
                      fullWidth
                    />
                    <TextField
                      label="Texte d'aide sous le champ code"
                      size="small"
                      value={form.referenceCode.helperText ?? ""}
                      onChange={(e) =>
                        updateForm(index, {
                          ...form,
                          referenceCode: {
                            ...form.referenceCode,
                            helperText: e.target.value,
                          },
                        })
                      }
                      fullWidth
                      multiline
                      minRows={2}
                    />
                  </>
                ) : null}
              </Stack>
            </ConfigEditorOptionPanel>
                </ConfigEditorCollapsibleItem>
              )}
            </ConfigEditorDraggableItem>
          );
        })}
      </ConfigEditorSortableList>
      <ConfigEditorAddButton
        label="Ajouter une aide"
        onClick={() => {
          const rule = {
            id: generateConfigItemId("aid"),
            label: "Nouvelle aide",
            effect: { type: "admin_review" as const },
            form: defaultAidForm(),
          };
          onChange({
            ...config,
            aidRules: [...config.aidRules, rule],
          });
          expansion.expandItem(rule.id);
        }}
      />
    </ConfigEditorRoot>
  );
}
