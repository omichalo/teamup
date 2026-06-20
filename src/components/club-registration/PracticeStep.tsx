"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import {
  getEnabledSections,
  getEnabledSites,
} from "@/lib/club-registration-config/helpers";
import { formatSectionPracticeLabel } from "@/lib/club-registration-config/site-display";
import { useRegistrationConfigValue } from "@/hooks/useRegistrationConfig";
import type { RegistrationDraft } from "./registration-defaults";
import { PracticeSlotPicker } from "./PracticeSlotPicker";
import {
  PracticeCompetitorJerseyField,
  PracticeOptionalJerseySection,
} from "./PracticeJerseySection";

type Props = {
  draft: RegistrationDraft;
  onChange: (patch: Partial<RegistrationDraft>) => void;
};

function siteIdsMatchingMainSection(
  mainSectionId: string,
  sites: ReturnType<typeof getEnabledSites>
): Set<string> {
  const ids = new Set<string>();
  for (const site of sites) {
    if (site.id === mainSectionId || site.linkedSectionIds.includes(mainSectionId)) {
      ids.add(site.id);
    }
  }
  return ids;
}

/** Supplément compétition affiché à côté de la case (catalogue `priceCents`). */
function formatCompetitionAddonEuros(priceCents: number): string {
  if (priceCents <= 0) {
    return "Sans supplément";
  }
  return `${(priceCents / 100).toFixed(0)} €`;
}

/**
 * Étape 4 — « Pratique sportive ».
 *
 * Regroupe tout ce qui touche au choix de pratique sportive de l'adhérent :
 * - lieu principal (`mainSectionId`) et lieux complémentaires ;
 * - créneaux souhaités, organisés par accordéon par lieu ;
 * - extension compétiteur (anciennement à l'étape « consentements ») : taille
 *   de maillot et compétitions visées.
 *
 * Le terme « lieu principal » est préféré à « section principale » : pour la
 * plupart des entrées la valeur correspond à un site géographique (Voisins,
 * Villepreux, etc.). Les sections « handisport » et « sport-adapté » restent
 * proposées dans la même liste.
 */
export function PracticeStep({ draft, onChange }: Props) {
  const config = useRegistrationConfigValue();
  const sectionOptions = getEnabledSections(config);
  const youthCompetitions = config.competitions.filter(
    (c) => c.enabled && c.formGroup === "youth"
  );
  const otherCompetitions = config.competitions.filter(
    (c) => c.enabled && c.formGroup === "other"
  );
  const youthBundle = config.competitionBundles[0];

  const [expandedSiteIds, setExpandedSiteIds] = useState<Set<string>>(() =>
    siteIdsMatchingMainSection(draft.mainSectionId, getEnabledSites(config))
  );

  /** À chaque changement de lieu principal : un seul bloc de créneaux ouvert
   * (celui qui correspond à l’id). */
  useEffect(() => {
    setExpandedSiteIds(
      siteIdsMatchingMainSection(draft.mainSectionId, getEnabledSites(config))
    );
  }, [draft.mainSectionId, config]);

  const toggleAdditionalSection = (id: string) => {
    if (id === draft.mainSectionId) return;
    const set = new Set(draft.additionalSectionIds);
    if (set.has(id)) {
      set.delete(id);
    } else {
      set.add(id);
    }
    onChange({ additionalSectionIds: Array.from(set) });
  };

  const toggleCompetition = (id: string) => {
    const set = new Set(draft.competitionIds);
    if (set.has(id)) {
      set.delete(id);
    } else {
      set.add(id);
    }
    onChange({ competitionIds: Array.from(set) });
  };

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Choisissez votre lieu principal d&apos;entraînement, d&apos;éventuels
        lieux complémentaires, puis les créneaux auxquels vous souhaitez
        participer.
      </Typography>

      <FormControl fullWidth required>
        <InputLabel id="main-section-label">
          Lieu principal d’entraînement
        </InputLabel>
        <Select
          labelId="main-section-label"
          label="Lieu principal d’entraînement"
          name="mainSectionId"
          value={draft.mainSectionId}
          onChange={(e) => {
            const next = e.target.value as RegistrationDraft["mainSectionId"];
            const cleaned = draft.additionalSectionIds.filter((x) => x !== next);
            onChange({
              mainSectionId: next,
              additionalSectionIds: cleaned,
            });
          }}
        >
          {sectionOptions.map((s) => (
            <MenuItem key={s.id} value={s.id}>
              {formatSectionPracticeLabel(config, s)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Stack spacing={0.5}>
        <Typography
          variant="subtitle2"
          data-field="additionalSectionIds"
          tabIndex={-1}
        >
          Autres lieux fréquentés (optionnel)
        </Typography>
        <FormGroup>
          {sectionOptions.filter((s) => s.id !== draft.mainSectionId).map(
            (s) => (
              <FormControlLabel
                key={s.id}
                control={
                  <Checkbox
                    checked={draft.additionalSectionIds.includes(s.id)}
                    onChange={() => toggleAdditionalSection(s.id)}
                  />
                }
                label={formatSectionPracticeLabel(config, s)}
              />
            )
          )}
        </FormGroup>
      </Stack>

      <PracticeSlotPicker
        draft={draft}
        expandedSiteIds={expandedSiteIds}
        onExpandedSiteIdsChange={setExpandedSiteIds}
        onChange={onChange}
      />

      <Typography
        variant="subtitle1"
        component="h3"
        sx={{ color: "primary.main", fontWeight: 700, pt: 1 }}
      >
        Pratique compétiteur
      </Typography>

      <FormControlLabel
        data-field="wantsCompetitorExtras"
        control={
          <Switch
            checked={draft.wantsCompetitorExtras}
            onChange={(e) => {
              const checked = e.target.checked;
              onChange({
                wantsCompetitorExtras: checked,
                ...(checked
                  ? {
                      wantsOptionalJersey: false,
                      optionalJerseySize: undefined,
                    }
                  : {}),
              });
            }}
          />
        }
        label="Je souhaite m'inscrire en section compétiteur (maillot et compétitions)"
      />

      {draft.wantsCompetitorExtras ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: -1 }}>
          {config.uiCopy.competitorJerseyHelper}
        </Typography>
      ) : null}

      {draft.wantsCompetitorExtras && (
        <Stack spacing={2}>
          <PracticeCompetitorJerseyField config={config} draft={draft} onChange={onChange} />

          <Typography
            variant="subtitle2"
            data-field="competitionIds"
            tabIndex={-1}
          >
            Compétitions envisagées
          </Typography>

          <Box
            component="fieldset"
            sx={{
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
              p: 1.5,
              m: 0,
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="baseline"
              component="legend"
              sx={{ mb: 0.5, width: "100%" }}
            >
              <Typography variant="subtitle2" component="span">
                Compétitions jeunes
              </Typography>
              <Typography
                variant="body2"
                component="span"
                fontWeight={700}
                color="primary.main"
              >
                {youthBundle
                  ? `${(youthBundle.priceCents / 100).toFixed(0)} €`
                  : ""}
              </Typography>
            </Stack>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 1 }}
            >
              Forfait unique — cochez une ou les deux compétitions ci-dessous.
            </Typography>
            <FormGroup>
              {youthCompetitions.map((c) => (
                <FormControlLabel
                  key={c.id}
                  sx={{ mx: 0 }}
                  control={
                    <Checkbox
                      checked={draft.competitionIds.includes(c.id)}
                      onChange={() => toggleCompetition(c.id)}
                    />
                  }
                  label={c.formLabel}
                />
              ))}
            </FormGroup>
          </Box>

          <Box
            sx={(theme) => ({
              /* Même retrait horizontal que le contenu du fieldset (bordure 1px + p: 1.5). */
              paddingLeft: `calc(${theme.spacing(1.5)} + 1px)`,
              paddingRight: `calc(${theme.spacing(1.5)} + 1px)`,
            })}
          >
            <FormGroup>
              {otherCompetitions.map((c) => (
                <FormControlLabel
                  key={c.id}
                  sx={{
                    alignItems: "center",
                    mx: 0,
                    width: "100%",
                    "& .MuiFormControlLabel-label": { flex: 1, minWidth: 0 },
                  }}
                  control={
                    <Checkbox
                      checked={draft.competitionIds.includes(c.id)}
                      onChange={() => toggleCompetition(c.id)}
                    />
                  }
                  label={
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      spacing={1}
                      sx={{ width: "100%" }}
                    >
                      <Typography component="span" variant="body2">
                        {c.formLabel}
                      </Typography>
                      <Typography
                        component="span"
                        variant="body2"
                        fontWeight={700}
                        color="primary.main"
                        sx={{ flexShrink: 0 }}
                      >
                        {formatCompetitionAddonEuros(c.priceCents)}
                      </Typography>
                    </Stack>
                  }
                />
              ))}
            </FormGroup>
          </Box>
        </Stack>
      )}

      <PracticeOptionalJerseySection config={config} draft={draft} onChange={onChange} />
    </Stack>
  );
}
