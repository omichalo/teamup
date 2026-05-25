"use client";

import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { ConfigPublishBar } from "./ConfigPublishBar";
import { ConfigMetaSection } from "./ConfigMetaSection";
import { SectionsEditor } from "./SectionsEditor";
import { PricingProfilesEditor } from "./PricingProfilesEditor";
import { SitesSlotsEditor } from "./SitesSlotsEditor";
import { CompetitionsEditor } from "./CompetitionsEditor";
import { AgeBandsEditor } from "./AgeBandsEditor";
import { RateTableEditor } from "./RateTableEditor";
import { DiscountRulesEditor } from "./DiscountRulesEditor";
import { AidRulesEditor } from "./AidRulesEditor";
import { StripePresentationEditor } from "./StripePresentationEditor";
import { ExportImportPanel } from "./ExportImportPanel";
import { useRegistrationConfigDraft } from "./useRegistrationConfigDraft";
import {
  CONFIG_PAGE_BLOCK_SPACING,
  configSurfaceSx,
  configTabPanelSx,
  configTabsAreaSx,
  configTabsSx,
} from "./config-editor-layout";

const TABS = [
  "Général",
  "Sections",
  "Profils tarifaires",
  "Lieux & créneaux",
  "Compétitions",
  "Profils d'âge",
  "Tarifs",
  "Remises",
  "Aides",
  "Stripe",
  "Export / Import",
] as const;

export function RegistrationConfigClient() {
  const [tab, setTab] = useState(0);
  const {
    draft,
    meta,
    loading,
    saving,
    publishing,
    error,
    dirty,
    load,
    updateDraft,
    saveDraft,
    publish,
  } = useRegistrationConfigDraft();

  if (loading || !draft) {
    return (
      <Stack alignItems="center" py={6}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Chargement de la configuration…</Typography>
      </Stack>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 } }}>
      <Stack spacing={CONFIG_PAGE_BLOCK_SPACING}>
        <ConfigPublishBar
          dirty={dirty}
          saving={saving}
          publishing={publishing}
          draftCatalogVersion={draft.meta.catalogVersion}
          activeCatalogVersion={meta?.activeCatalogVersion ?? null}
          activePublishedAt={meta?.activePublishedAt ?? null}
          onSave={() => void saveDraft()}
          onPublish={() => void publish()}
        />

        {error && <Alert severity="error">{error}</Alert>}

        <Paper elevation={0} sx={configSurfaceSx}>
          <Box sx={configTabsAreaSx}>
            <Tabs
              value={tab}
              onChange={(_, value: number) => setTab(value)}
              variant="scrollable"
              scrollButtons="auto"
              sx={configTabsSx}
            >
              {TABS.map((label) => (
                <Tab key={label} label={label} />
              ))}
            </Tabs>
          </Box>

          <Box sx={configTabPanelSx}>
            {tab === 0 && <ConfigMetaSection config={draft} onChange={updateDraft} />}
            {tab === 1 && <SectionsEditor config={draft} onChange={updateDraft} />}
            {tab === 2 && <PricingProfilesEditor config={draft} onChange={updateDraft} />}
            {tab === 3 && <SitesSlotsEditor config={draft} onChange={updateDraft} />}
            {tab === 4 && <CompetitionsEditor config={draft} onChange={updateDraft} />}
            {tab === 5 && <AgeBandsEditor config={draft} onChange={updateDraft} />}
            {tab === 6 && <RateTableEditor config={draft} onChange={updateDraft} />}
            {tab === 7 && <DiscountRulesEditor config={draft} onChange={updateDraft} />}
            {tab === 8 && <AidRulesEditor config={draft} onChange={updateDraft} />}
            {tab === 9 && <StripePresentationEditor config={draft} onChange={updateDraft} />}
            {tab === 10 && <ExportImportPanel config={draft} onImported={() => void load()} />}
          </Box>
        </Paper>
      </Stack>
    </Container>
  );
}
