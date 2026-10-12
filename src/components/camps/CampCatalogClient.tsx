"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import type {
  CampCatalogFormula,
  CampCatalogPricing,
  CampCatalogSite,
  CampPricingRates,
} from "@/lib/camps/types";
import { CampCatalogFormulasTab } from "./CampCatalogFormulasTab";
import { CampCatalogPricingsTab } from "./CampCatalogPricingsTab";
import { CampCatalogSitesTab } from "./CampCatalogSitesTab";

export function CampCatalogClient() {
  const [tab, setTab] = useState(0);
  const [sites, setSites] = useState<CampCatalogSite[]>([]);
  const [formulas, setFormulas] = useState<CampCatalogFormula[]>([]);
  const [pricings, setPricings] = useState<CampCatalogPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [newSiteLabel, setNewSiteLabel] = useState("");
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [editingSiteLabel, setEditingSiteLabel] = useState("");

  const [formulaForm, setFormulaForm] = useState<"create" | "edit" | null>(null);
  const [editingFormula, setEditingFormula] = useState<CampCatalogFormula | null>(
    null
  );

  const [pricingForm, setPricingForm] = useState<"create" | "edit" | null>(null);
  const [editingPricing, setEditingPricing] = useState<CampCatalogPricing | null>(
    null
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sitesRes, formulasRes, pricingsRes] = await Promise.all([
        fetch("/api/club/camps/catalog/sites", { credentials: "include" }),
        fetch("/api/club/camps/catalog/formulas", { credentials: "include" }),
        fetch("/api/club/camps/catalog/pricings", { credentials: "include" }),
      ]);
      const sitesJson = (await sitesRes.json()) as {
        sites?: CampCatalogSite[];
        error?: string;
      };
      const formulasJson = (await formulasRes.json()) as {
        formulas?: CampCatalogFormula[];
        error?: string;
      };
      const pricingsJson = (await pricingsRes.json()) as {
        pricings?: CampCatalogPricing[];
        error?: string;
      };
      if (!sitesRes.ok) throw new Error(sitesJson.error ?? "Sites impossibles");
      if (!formulasRes.ok) {
        throw new Error(formulasJson.error ?? "Formules impossibles");
      }
      if (!pricingsRes.ok) {
        throw new Error(pricingsJson.error ?? "Tarifs impossibles");
      }
      setSites(sitesJson.sites ?? []);
      setFormulas(formulasJson.formulas ?? []);
      setPricings(pricingsJson.pricings ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createSite() {
    const label = newSiteLabel.trim();
    if (!label) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/club/camps/catalog/sites", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Création impossible");
      setNewSiteLabel("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function saveSiteEdit() {
    if (!editingSiteId) return;
    const label = editingSiteLabel.trim();
    if (!label) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/club/camps/catalog/sites/${editingSiteId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Mise à jour impossible");
      setEditingSiteId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function removeSite(siteId: string) {
    if (!window.confirm("Supprimer ce site du catalogue ?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/club/camps/catalog/sites/${siteId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Suppression impossible");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function submitFormula(data: {
    label: string;
    pricingMode: CampCatalogFormula["pricingMode"];
    sessions: CampCatalogFormula["sessions"];
    catalogSiteIds: string[];
  }) {
    setBusy(true);
    setError(null);
    try {
      const isEdit = formulaForm === "edit" && editingFormula;
      const res = await fetch(
        isEdit
          ? `/api/club/camps/catalog/formulas/${editingFormula.id}`
          : "/api/club/camps/catalog/formulas",
        {
          method: isEdit ? "PATCH" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Enregistrement impossible");
      setFormulaForm(null);
      setEditingFormula(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function removeFormula(formulaId: string) {
    if (!window.confirm("Supprimer cette formule du catalogue ?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/club/camps/catalog/formulas/${formulaId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Suppression impossible");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function submitPricing(data: { label: string; rates: CampPricingRates }) {
    setBusy(true);
    setError(null);
    try {
      const isEdit = pricingForm === "edit" && editingPricing;
      const res = await fetch(
        isEdit
          ? `/api/club/camps/catalog/pricings/${editingPricing.id}`
          : "/api/club/camps/catalog/pricings",
        {
          method: isEdit ? "PATCH" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Enregistrement impossible");
      setPricingForm(null);
      setEditingPricing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function removePricing(pricingId: string) {
    if (!window.confirm("Supprimer cette grille tarifaire du catalogue ?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/club/camps/catalog/pricings/${pricingId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Suppression impossible");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 960, mx: "auto", px: 2, py: 3 }}>
      <Button
        component={Link}
        href="/club/stages"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2 }}
      >
        Stages
      </Button>
      <Typography variant="h4" component="h1" fontWeight={700} sx={{ mb: 1 }}>
        Catalogue stages
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Sites, formules et grilles tarifaires réutilisables, à assigner à chaque
        stage.
      </Typography>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <Tabs value={tab} onChange={(_, v: number) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`Sites (${sites.length})`} />
        <Tab label={`Formules (${formulas.length})`} />
        <Tab label={`Tarifs (${pricings.length})`} />
      </Tabs>

      {tab === 0 ? (
        <CampCatalogSitesTab
          sites={sites}
          busy={busy}
          newSiteLabel={newSiteLabel}
          editingSiteId={editingSiteId}
          editingSiteLabel={editingSiteLabel}
          onNewSiteLabelChange={setNewSiteLabel}
          onCreate={() => void createSite()}
          onStartEdit={(site) => {
            setEditingSiteId(site.id);
            setEditingSiteLabel(site.label);
          }}
          onEditingLabelChange={setEditingSiteLabel}
          onCancelEdit={() => setEditingSiteId(null)}
          onSaveEdit={() => void saveSiteEdit()}
          onRemove={(id) => void removeSite(id)}
        />
      ) : null}

      {tab === 1 ? (
        <CampCatalogFormulasTab
          formulas={formulas}
          sites={sites}
          busy={busy}
          formulaForm={formulaForm}
          editingFormula={editingFormula}
          onStartCreate={() => {
            setEditingFormula(null);
            setFormulaForm("create");
          }}
          onStartEdit={(formula) => {
            setEditingFormula(formula);
            setFormulaForm("edit");
          }}
          onCancelForm={() => {
            setFormulaForm(null);
            setEditingFormula(null);
          }}
          onSubmitForm={(data) => void submitFormula(data)}
          onRemove={(id) => void removeFormula(id)}
        />
      ) : null}

      {tab === 2 ? (
        <CampCatalogPricingsTab
          pricings={pricings}
          busy={busy}
          formMode={pricingForm}
          editingPricing={editingPricing}
          onStartCreate={() => {
            setEditingPricing(null);
            setPricingForm("create");
          }}
          onStartEdit={(pricing) => {
            setEditingPricing(pricing);
            setPricingForm("edit");
          }}
          onCancelForm={() => {
            setPricingForm(null);
            setEditingPricing(null);
          }}
          onSubmitForm={(data) => void submitPricing(data)}
          onRemove={(id) => void removePricing(id)}
        />
      ) : null}
    </Box>
  );
}
