"use client";

import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { CAMP_PRICING_MODE_LABELS } from "@/lib/camps/constants";
import { minutesToTimeInput } from "@/lib/camps/time";
import type { CampCatalogFormula, CampCatalogSite } from "@/lib/camps/types";
import { CampCatalogFormulaForm } from "./CampCatalogFormulaForm";

type Props = {
  formulas: CampCatalogFormula[];
  sites: CampCatalogSite[];
  busy: boolean;
  formulaForm: "create" | "edit" | null;
  editingFormula: CampCatalogFormula | null;
  onStartCreate: () => void;
  onStartEdit: (formula: CampCatalogFormula) => void;
  onCancelForm: () => void;
  onSubmitForm: (data: {
    label: string;
    pricingMode: CampCatalogFormula["pricingMode"];
    sessions: CampCatalogFormula["sessions"];
    catalogSiteIds: string[];
  }) => void;
  onRemove: (formulaId: string) => void;
};

function siteLabelsForFormula(
  formula: CampCatalogFormula,
  sites: CampCatalogSite[]
): string {
  if (formula.catalogSiteIds.length === 0) return "Tous les sites";
  const labels = formula.catalogSiteIds.map(
    (id) => sites.find((s) => s.id === id)?.label ?? id
  );
  return labels.join(" · ");
}

export function CampCatalogFormulasTab({
  formulas,
  sites,
  busy,
  formulaForm,
  editingFormula,
  onStartCreate,
  onStartEdit,
  onCancelForm,
  onSubmitForm,
  onRemove,
}: Props) {
  return (
    <Stack spacing={2}>
      {formulaForm === null ? (
        <Button
          startIcon={<AddIcon />}
          variant="outlined"
          onClick={onStartCreate}
          disabled={busy}
          sx={{ alignSelf: "flex-start" }}
        >
          Nouvelle formule
        </Button>
      ) : (
        <CampCatalogFormulaForm
          key={editingFormula?.id ?? "new"}
          mode={formulaForm}
          sites={sites}
          initial={
            editingFormula
              ? {
                  label: editingFormula.label,
                  pricingMode: editingFormula.pricingMode,
                  sessions: editingFormula.sessions,
                  catalogSiteIds: editingFormula.catalogSiteIds,
                }
              : {
                  label: "",
                  pricingMode: "day_week",
                  sessions: [],
                  catalogSiteIds: [],
                }
          }
          disabled={busy}
          onCancel={onCancelForm}
          onSubmit={onSubmitForm}
        />
      )}

      {formulas.length === 0 && formulaForm === null ? (
        <Alert severity="info">Aucune formule catalogue pour l’instant.</Alert>
      ) : null}

      {formulas.map((formula) => (
        <Stack
          key={formula.id}
          direction="row"
          spacing={1}
          alignItems="flex-start"
          sx={{
            p: 1.5,
            borderRadius: 1,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              <Typography fontWeight={600}>{formula.label}</Typography>
              <Chip
                size="small"
                variant="outlined"
                label={CAMP_PRICING_MODE_LABELS[formula.pricingMode]}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary" display="block">
              Sites : {siteLabelsForFormula(formula, sites)}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              {formula.sessions
                .map(
                  (s) =>
                    `${s.label} ${minutesToTimeInput(s.startMinutes)}–${minutesToTimeInput(s.endMinutes)}`
                )
                .join(" · ")}
            </Typography>
          </Box>
          <IconButton
            size="small"
            disabled={busy || formulaForm !== null}
            aria-label={`Modifier ${formula.label}`}
            onClick={() => onStartEdit(formula)}
          >
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            disabled={busy || formulaForm !== null}
            aria-label={`Supprimer ${formula.label}`}
            onClick={() => onRemove(formula.id)}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Stack>
      ))}
    </Stack>
  );
}
