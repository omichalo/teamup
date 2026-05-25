"use client";

import { MenuItem, Stack, TextField } from "@mui/material";
import type { RateTableEntry, RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import { moveArrayItem } from "@/lib/club-registration-config/sort-order";
import { buildAgeBandSelectOptions } from "./AgeBandsEditor";
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
import { rateEntryDecor } from "./config-editor-item-decor";
import { listPricingProfiles, pricingProfileLabel } from "@/lib/club-registration-config/pricing-profiles";
import {
  ConfigEditorDraggableItem,
  ConfigEditorSortableList,
} from "./ConfigEditorSortableList";

type Props = {
  config: RegistrationConfigV1;
  onChange: (config: RegistrationConfigV1) => void;
};

function matchSummary(config: RegistrationConfigV1, entry: RateTableEntry): string {
  const parts = [pricingProfileLabel(config, entry.match.pricingProfile)];
  if (entry.match.ageBandId) parts.push("Tranche");
  if (entry.match.wantsCompetitorExtras === false) parts.push("Loisir");
  if (entry.match.wantsCompetitorExtras === true) parts.push("Compétiteur");
  return parts.join(" · ");
}

function rateEntrySummaryMeta(
  config: RegistrationConfigV1,
  entry: RateTableEntry,
  index: number
): string {
  const parts: string[] = [];
  if (index === 0) parts.push("Priorité max");
  parts.push(matchSummary(config, entry));
  parts.push(
    `Adh. ${centsToEuroInput(entry.membershipCents)} € + Lic. ${centsToEuroInput(entry.licenseCents)} €`
  );
  return parts.join(" · ");
}

export function RateTableEditor({ config, onChange }: Props) {
  const ageBandOptions = buildAgeBandSelectOptions(config);
  const expansion = useConfigEditorExpansion();

  const updateEntry = (entryId: string, patch: Partial<RateTableEntry>) => {
    onChange({
      ...config,
      rateTable: config.rateTable.map((entry) =>
        entry.id === entryId ? { ...entry, ...patch } : entry
      ),
    });
  };

  const updateMatch = (entryId: string, patch: Partial<RateTableEntry["match"]>) => {
    const entry = config.rateTable.find((item) => item.id === entryId);
    if (!entry) return;
    updateEntry(entryId, { match: { ...entry.match, ...patch } });
  };

  const moveEntry = (fromIndex: number, toIndex: number) => {
    onChange({
      ...config,
      rateTable: moveArrayItem(config.rateTable, fromIndex, toIndex),
    });
  };

  return (
    <ConfigEditorRoot>
      <ConfigEditorInfoAlert>
        Grille tarifaire : la <strong>première règle correspondante</strong> est appliquée lors du
        calcul du devis. Placez les règles les plus spécifiques en haut.
      </ConfigEditorInfoAlert>
      <ConfigEditorHint>
        Glissez-déposez pour ajuster la priorité. Montants saisis en euros.
      </ConfigEditorHint>
      <ConfigEditorSortableList droppableId="rate-table" onMove={moveEntry}>
        {config.rateTable.map((entry, index) => (
          <ConfigEditorDraggableItem key={entry.id} draggableId={entry.id} index={index}>
            {({ dragHandleProps, isDragging }) => (
              <ConfigEditorCollapsibleItem
                expanded={expansion.isExpanded(entry.id)}
                onExpandedChange={(open) => expansion.setExpanded(entry.id, open)}
                title={entry.segmentLabel}
                itemLabel={entry.segmentLabel}
                meta={rateEntrySummaryMeta(config, entry, index)}
                decor={rateEntryDecor}
                dragHandleProps={dragHandleProps}
                isDragging={isDragging}
                removeButton={
                  <ConfigEditorRemoveAction
                    label="Supprimer la règle"
                    disabled={config.rateTable.length <= 1}
                    onClick={() =>
                      onChange({
                        ...config,
                        rateTable: config.rateTable.filter((item) => item.id !== entry.id),
                      })
                    }
                  />
                }
              >
          <TextField
            label="Libellé affiché sur le devis"
            size="small"
            value={entry.segmentLabel}
            onChange={(e) => updateEntry(entry.id, { segmentLabel: e.target.value })}
            fullWidth
          />
          <ConfigEditorOptionPanel title="Conditions d'application">
            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              <TextField
                select
                label="Profil tarifaire"
                size="small"
                value={entry.match.pricingProfile}
                onChange={(e) =>
                  updateMatch(entry.id, {
                    pricingProfile: e.target.value as RateTableEntry["match"]["pricingProfile"],
                  })
                }
                sx={{ flex: 1 }}
              >
                {listPricingProfiles(config).map((profile) => (
                  <MenuItem key={profile.id} value={profile.id}>
                    {profile.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Tranche d'âge"
                size="small"
                value={entry.match.ageBandId ?? ""}
                onChange={(e) => updateMatch(entry.id, { ageBandId: e.target.value || undefined })}
                sx={{ flex: 1 }}
              >
                <MenuItem value="">— Toutes —</MenuItem>
                {ageBandOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Pratique"
                size="small"
                value={entry.match.practiceLevel ?? ""}
                onChange={(e) =>
                  updateMatch(entry.id, {
                    practiceLevel: (e.target.value ||
                      undefined) as RateTableEntry["match"]["practiceLevel"],
                  })
                }
                sx={{ flex: 1 }}
              >
                <MenuItem value="">—</MenuItem>
                <MenuItem value="leisure">Loisir</MenuItem>
                <MenuItem value="competition">Compétition</MenuItem>
              </TextField>
              <TextField
                select
                label="Compétiteur"
                size="small"
                value={
                  entry.match.wantsCompetitorExtras === undefined
                    ? ""
                    : entry.match.wantsCompetitorExtras
                      ? "true"
                      : "false"
                }
                onChange={(e) =>
                  updateMatch(entry.id, {
                    wantsCompetitorExtras:
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
          <ConfigEditorOptionPanel title="Montants">
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <EuroAmountField
                label="Adhésion club"
                valueCents={entry.membershipCents}
                onChangeCents={(membershipCents) => updateEntry(entry.id, { membershipCents })}
                sx={{ flex: 1 }}
              />
              <EuroAmountField
                label="Licence FFTT"
                valueCents={entry.licenseCents}
                onChangeCents={(licenseCents) => updateEntry(entry.id, { licenseCents })}
                sx={{ flex: 1 }}
              />
            </Stack>
          </ConfigEditorOptionPanel>
              </ConfigEditorCollapsibleItem>
            )}
          </ConfigEditorDraggableItem>
        ))}
      </ConfigEditorSortableList>
      <ConfigEditorAddButton
        label="Ajouter une règle tarifaire"
        onClick={() => {
          const entry = {
            id: generateConfigItemId("rate"),
            match: { pricingProfile: "classic" as const },
            membershipCents: 0,
            licenseCents: 0,
            segmentLabel: "Nouveau tarif",
          };
          onChange({
            ...config,
            rateTable: [...config.rateTable, entry],
          });
          expansion.expandItem(entry.id);
        }}
      />
    </ConfigEditorRoot>
  );
}
