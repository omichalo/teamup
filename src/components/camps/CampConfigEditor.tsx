"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
import { CAMP_PRICING_MODE_LABELS } from "@/lib/camps/constants";
import { minutesToTimeInput } from "@/lib/camps/time";
import type { Camp, CampSiteConfig } from "@/lib/camps/types";
import {
  centsToEurosInput,
  pricingEurosToCents,
  type CampPricingEurosDraft,
} from "./camp-pricing-draft";
import { CampAssignFromCatalog } from "./CampAssignFromCatalog";
import { CampAssignPricingFromCatalog } from "./CampAssignPricingFromCatalog";
import { CampPricingFields } from "./CampPricingFields";

type Props = {
  camp: Camp;
  saving: boolean;
  onSave: (patch: {
    sites: CampSiteConfig[];
    pricing: Camp["pricing"];
    catalogPricingId?: string | null;
  }) => Promise<void>;
};

function pricingDraftFromCamp(camp: Camp): CampPricingEurosDraft {
  return {
    memberDay: centsToEurosInput(camp.pricing.memberDayCents),
    memberWeek: centsToEurosInput(camp.pricing.memberWeekCents),
    nonMemberDay: centsToEurosInput(camp.pricing.nonMemberDayCents),
    nonMemberWeek: centsToEurosInput(camp.pricing.nonMemberWeekCents),
    session2h: centsToEurosInput(camp.pricing.session2hCents),
    twoSessionsSameDay: centsToEurosInput(camp.pricing.twoSessionsSameDayCents),
  };
}

export function CampConfigEditor({ camp, saving, onSave }: Props) {
  const [sites, setSites] = useState<CampSiteConfig[]>(camp.sites);
  const [pricing, setPricing] = useState<CampPricingEurosDraft>(() =>
    pricingDraftFromCamp(camp)
  );
  const [catalogPricingId, setCatalogPricingId] = useState<string | null>(
    camp.catalogPricingId ?? null
  );
  const [assigning, setAssigning] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const dirty = useMemo(() => {
    const pricingCents = pricingEurosToCents(pricing);
    if (!pricingCents) return true;
    return (
      JSON.stringify(sites) !== JSON.stringify(camp.sites) ||
      JSON.stringify(pricingCents) !== JSON.stringify(camp.pricing) ||
      catalogPricingId !== (camp.catalogPricingId ?? null)
    );
  }, [sites, pricing, catalogPricingId, camp.sites, camp.pricing, camp.catalogPricingId]);

  function discardLocalChanges() {
    setSites(camp.sites);
    setPricing(pricingDraftFromCamp(camp));
    setCatalogPricingId(camp.catalogPricingId ?? null);
    setAssigning(false);
    setLocalError(null);
  }

  async function handleSave() {
    setLocalError(null);
    if (assigning) {
      setLocalError("Terminez ou annulez l’assignation catalogue avant d’enregistrer.");
      return;
    }
    const pricingCents = pricingEurosToCents(pricing);
    if (!pricingCents) {
      setLocalError("Renseignez tous les tarifs (montants ≥ 0 en euros).");
      return;
    }
    try {
      await onSave({
        sites,
        pricing: pricingCents,
        catalogPricingId,
      });
    } catch {
      // Erreur page parente
    }
  }

  return (
    <Box
      sx={{
        mb: 3,
        p: { xs: 2, sm: 2.5 },
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ sm: "flex-start" }}
        spacing={1}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h6" fontWeight={700}>
            1. Sites & tarifs
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Assignez sites, formules et grille tarifaire depuis le{" "}
            <Link href="/club/stages/catalogue">catalogue</Link>. Les montants
            restent modifiables pour ce stage.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexShrink={0}>
          {dirty ? (
            <Button size="small" onClick={discardLocalChanges} disabled={saving}>
              Annuler les modifications
            </Button>
          ) : null}
          <Button
            size="small"
            variant="contained"
            onClick={() => void handleSave()}
            disabled={saving || !dirty}
          >
            Enregistrer
          </Button>
        </Stack>
      </Stack>

      {localError ? <Alert severity="error" sx={{ mb: 2 }}>{localError}</Alert> : null}
      {dirty ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Modifications non enregistrées — pensez à cliquer sur Enregistrer.
        </Alert>
      ) : null}

      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
        Sites assignés ({sites.length})
      </Typography>

      {sites.length === 0 && !assigning ? (
        <Alert severity="info" sx={{ mb: 1.5 }}>
          Aucun site. Assignez-en depuis le catalogue avant de générer les
          créneaux.
        </Alert>
      ) : null}

      <Stack spacing={1} sx={{ mb: 1.5 }}>
        {sites.map((site) => (
          <Stack
            key={site.id}
            direction="row"
            alignItems="flex-start"
            spacing={1}
            sx={{
              p: 1.5,
              borderRadius: 1,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography fontWeight={600}>{site.label}</Typography>
              <Stack spacing={0.75} sx={{ mt: 0.75 }}>
                {site.formulas.map((formula) => (
                  <Box key={formula.id}>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      <Chip size="small" label={formula.label} />
                      <Chip
                        size="small"
                        variant="outlined"
                        label={CAMP_PRICING_MODE_LABELS[formula.pricingMode]}
                      />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {formula.sessions
                        .map(
                          (s) =>
                            `${s.label} ${minutesToTimeInput(s.startMinutes)}–${minutesToTimeInput(s.endMinutes)}`
                        )
                        .join(" · ")}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
            <IconButton
              aria-label={`Retirer ${site.label}`}
              size="small"
              color="error"
              onClick={() => setSites((prev) => prev.filter((s) => s.id !== site.id))}
              disabled={saving || assigning}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
      </Stack>

      {!assigning ? (
        <Button
          startIcon={<AddIcon />}
          variant="outlined"
          size="small"
          onClick={() => setAssigning(true)}
          disabled={saving}
          sx={{ mb: 3 }}
        >
          Assigner depuis le catalogue
        </Button>
      ) : (
        <CampAssignFromCatalog
          disabled={saving}
          existingSites={sites}
          onCancel={() => setAssigning(false)}
          onAssigned={(added) => {
            setSites((prev) => {
              const byId = new Map(prev.map((s) => [s.id, s]));
              for (const site of added) {
                byId.set(site.id, site);
              }
              return [...byId.values()];
            });
            setAssigning(false);
          }}
        />
      )}

      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
        Tarifs (€)
      </Typography>
      <CampAssignPricingFromCatalog
        disabled={saving}
        onApplied={({ catalogPricingId: id, rates }) => {
          setCatalogPricingId(id);
          setPricing({
            memberDay: centsToEurosInput(rates.memberDayCents),
            memberWeek: centsToEurosInput(rates.memberWeekCents),
            nonMemberDay: centsToEurosInput(rates.nonMemberDayCents),
            nonMemberWeek: centsToEurosInput(rates.nonMemberWeekCents),
            session2h: centsToEurosInput(rates.session2hCents),
            twoSessionsSameDay: centsToEurosInput(rates.twoSessionsSameDayCents),
          });
        }}
      />
      <CampPricingFields
        pricing={pricing}
        disabled={saving}
        onChange={(key, value) => {
          setCatalogPricingId(null);
          setPricing((p) => ({ ...p, [key]: value }));
        }}
      />
    </Box>
  );
}
