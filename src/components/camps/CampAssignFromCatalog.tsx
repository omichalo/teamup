"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Stack,
  Typography,
} from "@mui/material";
import { CAMP_PRICING_MODE_LABELS } from "@/lib/camps/constants";
import { campFormulaInstanceId } from "@/lib/camps/formulas";
import type {
  CampCatalogFormula,
  CampCatalogSite,
  CampSiteConfig,
} from "@/lib/camps/types";

type AssignmentDraft = {
  catalogSiteId: string;
  catalogFormulaIds: string[];
};

type Props = {
  disabled?: boolean | undefined;
  existingSites: CampSiteConfig[];
  onCancel: () => void;
  onAssigned: (sites: CampSiteConfig[]) => void;
};

export function CampAssignFromCatalog({
  disabled = false,
  existingSites,
  onCancel,
  onAssigned,
}: Props) {
  const [sites, setSites] = useState<CampCatalogSite[]>([]);
  const [formulas, setFormulas] = useState<CampCatalogFormula[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<AssignmentDraft[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [sitesRes, formulasRes] = await Promise.all([
          fetch("/api/club/camps/catalog/sites", { credentials: "include" }),
          fetch("/api/club/camps/catalog/formulas", { credentials: "include" }),
        ]);
        const sitesJson = (await sitesRes.json()) as {
          sites?: CampCatalogSite[];
          error?: string;
        };
        const formulasJson = (await formulasRes.json()) as {
          formulas?: CampCatalogFormula[];
          error?: string;
        };
        if (!sitesRes.ok) throw new Error(sitesJson.error ?? "Catalogue sites");
        if (!formulasRes.ok) {
          throw new Error(formulasJson.error ?? "Catalogue formules");
        }
        if (cancelled) return;
        const activeSites = (sitesJson.sites ?? []).filter((s) => s.active);
        const activeFormulas = (formulasJson.formulas ?? []).filter((f) => f.active);
        const already = new Set(
          existingSites.map((s) => s.catalogSiteId ?? s.id)
        );
        // Masquer les sites déjà présents sur le stage ; rien de pré-coché.
        setSites(activeSites.filter((s) => !already.has(s.id)));
        setFormulas(activeFormulas);
        setDrafts([]);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erreur");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [existingSites]);

  const selectedSiteIds = useMemo(
    () => new Set(drafts.map((d) => d.catalogSiteId)),
    [drafts]
  );

  function formulasForSite(siteId: string): CampCatalogFormula[] {
    return formulas.filter(
      (formula) =>
        formula.catalogSiteIds.length === 0 ||
        formula.catalogSiteIds.includes(siteId)
    );
  }

  function toggleSite(siteId: string) {
    setDrafts((prev) => {
      if (prev.some((d) => d.catalogSiteId === siteId)) {
        return prev.filter((d) => d.catalogSiteId !== siteId);
      }
      // Pré-coche toutes les formules liées au site (modifiables ensuite).
      return [
        ...prev,
        {
          catalogSiteId: siteId,
          catalogFormulaIds: formulasForSite(siteId).map((f) => f.id),
        },
      ];
    });
  }

  function toggleFormula(siteId: string, formulaId: string) {
    setDrafts((prev) =>
      prev.map((draft) => {
        if (draft.catalogSiteId !== siteId) return draft;
        const has = draft.catalogFormulaIds.includes(formulaId);
        return {
          ...draft,
          catalogFormulaIds: has
            ? draft.catalogFormulaIds.filter((id) => id !== formulaId)
            : [...draft.catalogFormulaIds, formulaId],
        };
      })
    );
  }

  async function handleAssign() {
    setError(null);
    const assignments = drafts.filter((d) => d.catalogFormulaIds.length > 0);
    if (assignments.length === 0) {
      setError("Sélectionnez au moins un site avec une formule.");
      return;
    }
    setBusy(true);
    try {
      // Snapshot côté client à partir du catalogue déjà chargé
      const built: CampSiteConfig[] = [];
      for (const assignment of assignments) {
        const site = sites.find((s) => s.id === assignment.catalogSiteId);
        if (!site) throw new Error("Site catalogue manquant");
        const siteFormulas = assignment.catalogFormulaIds.map((fid) => {
          const formula = formulas.find((f) => f.id === fid);
          if (!formula) throw new Error("Formule catalogue manquante");
          return {
            id: campFormulaInstanceId(site.id, formula.id),
            catalogFormulaId: formula.id,
            label: formula.label,
            pricingMode: formula.pricingMode,
            sessions: formula.sessions.map((s) => ({ ...s })),
          };
        });
        built.push({
          id: site.id,
          catalogSiteId: site.id,
          label: site.label,
          formulas: siteFormulas,
        });
      }
      onAssigned(built);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <Alert severity="info">Chargement du catalogue…</Alert>;
  }

  if (formulas.length === 0) {
    return (
      <Alert severity="warning">
        Catalogue incomplet. Créez d’abord des formules dans{" "}
        <strong>Catalogue stages</strong>, puis revenez assigner.
      </Alert>
    );
  }

  if (sites.length === 0) {
    return (
      <Alert severity="info">
        Tous les sites du catalogue sont déjà présents sur ce stage, ou aucun
        site n’est défini dans le catalogue.
      </Alert>
    );
  }

  return (
    <Stack
      spacing={1.5}
      sx={{
        p: 2,
        mb: 3,
        borderRadius: 1,
        border: "1px dashed",
        borderColor: "primary.main",
        bgcolor: "action.hover",
      }}
    >
      <Typography variant="subtitle2" fontWeight={700}>
        Assigner depuis le catalogue
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Choisissez les sites, puis les formules liées à chaque site. Une copie
        (snapshot) est enregistrée sur ce stage.
      </Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Stack spacing={1.5}>
        {sites.map((site) => {
          const selected = selectedSiteIds.has(site.id);
          const draft = drafts.find((d) => d.catalogSiteId === site.id);
          const siteFormulas = formulasForSite(site.id);
          return (
            <Box
              key={site.id}
              sx={{
                p: 1.5,
                borderRadius: 1,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selected}
                    onChange={() => toggleSite(site.id)}
                    disabled={disabled || busy}
                  />
                }
                label={<Typography fontWeight={600}>{site.label}</Typography>}
              />
              {selected && draft ? (
                siteFormulas.length === 0 ? (
                  <Alert severity="warning" sx={{ ml: 4, mt: 0.5 }}>
                    Aucune formule liée à ce site dans le catalogue.
                  </Alert>
                ) : (
                  <FormGroup sx={{ ml: 4 }}>
                    {siteFormulas.map((formula) => (
                      <FormControlLabel
                        key={formula.id}
                        control={
                          <Checkbox
                            size="small"
                            checked={draft.catalogFormulaIds.includes(formula.id)}
                            onChange={() => toggleFormula(site.id, formula.id)}
                            disabled={disabled || busy}
                          />
                        }
                        label={
                          <Stack direction="row" spacing={0.75} alignItems="center">
                            <Typography variant="body2">{formula.label}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {CAMP_PRICING_MODE_LABELS[formula.pricingMode]}
                            </Typography>
                          </Stack>
                        }
                      />
                    ))}
                  </FormGroup>
                )
              ) : null}
            </Box>
          );
        })}
      </Stack>

      <Stack direction="row" spacing={1}>
        <Button size="small" onClick={onCancel} disabled={disabled || busy}>
          Annuler
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={() => void handleAssign()}
          disabled={disabled || busy}
        >
          Ajouter au stage
        </Button>
      </Stack>
    </Stack>
  );
}
